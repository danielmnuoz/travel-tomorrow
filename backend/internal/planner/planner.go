package planner

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/config"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/foursquare"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/llm"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/scorer"
)

const shortlistSize = 8

type Planner struct {
	fsq foursquare.PlaceSearcher
	llm *llm.Client
	cfg *config.Config
}

func New(fsq foursquare.PlaceSearcher, llmClient *llm.Client, cfg *config.Config) *Planner {
	return &Planner{fsq: fsq, llm: llmClient, cfg: cfg}
}

func (p *Planner) Plan(ctx context.Context, req model.ItineraryRequest) (*model.ItineraryResponse, error) {
	// 1. Resolve city
	city, ok := model.Cities[req.City]
	if !ok {
		return nil, fmt.Errorf("unknown city: %s", req.City)
	}

	// 2. Map interests → Foursquare category IDs
	categoryIDs := foursquare.CategoryIDsForInterests(req.Interests)

	// 3. Fetch candidates from Foursquare (parallel per category)
	candidates, err := p.fetchCandidates(ctx, city, categoryIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch candidates: %w", err)
	}
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no places found for city %q with interests %v", req.City, req.Interests)
	}

	log.Printf("planner: fetched %d candidates across %d categories", len(candidates), len(categoryIDs))

	// 4. Score & shortlist
	scored := scorer.Score(candidates, req)
	shortlisted := scorer.Shortlist(scored, shortlistSize*len(categoryIDs))

	log.Printf("planner: shortlisted %d candidates", len(shortlisted))

	// 5. Build LLM prompt
	systemPrompt, err := p.loadSystemPrompt()
	if err != nil {
		return nil, fmt.Errorf("load system prompt: %w", err)
	}
	userPrompt, err := p.buildUserPrompt(shortlisted, req)
	if err != nil {
		return nil, fmt.Errorf("build user prompt: %w", err)
	}

	if p.cfg.Debug {
		log.Printf("[DEBUG] planner: user prompt sent to LLM:\n%s", userPrompt)
	}

	// 6. Call LLM
	log.Printf("planner: calling LLM for ranking + narrative...")
	rawJSON, err := p.llm.Chat(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("llm chat: %w", err)
	}

	if p.cfg.Debug {
		log.Printf("[DEBUG] planner: raw LLM response:\n%s", rawJSON)
	}

	// 7. Parse LLM response
	var llmResp model.LLMItineraryResponse
	if err := json.Unmarshal([]byte(rawJSON), &llmResp); err != nil {
		return nil, fmt.Errorf("parse llm response: %w (raw: %.200s)", err, rawJSON)
	}

	// 8. Merge LLM output with full candidate data
	resp := p.buildResponse(city, llmResp, shortlisted)
	return resp, nil
}

// fetchCandidates calls Foursquare for each category in parallel and deduplicates.
func (p *Planner) fetchCandidates(ctx context.Context, city model.CityInfo, categoryIDs []string) ([]model.Candidate, error) {
	type result struct {
		candidates []model.Candidate
		err        error
	}

	results := make([]result, len(categoryIDs))
	var wg sync.WaitGroup

	for i, catID := range categoryIDs {
		wg.Add(1)
		go func(idx int, id string) {
			defer wg.Done()
			c, err := p.fsq.SearchPlaces(ctx, city.Lat, city.Lng, p.cfg.SearchRadius, []string{id}, 15)
			results[idx] = result{candidates: c, err: err}
		}(i, catID)
	}
	wg.Wait()

	// Collect results, skip categories that errored (log them)
	seen := make(map[string]bool)
	var all []model.Candidate
	var firstErr error

	for i, r := range results {
		if r.err != nil {
			log.Printf("planner: foursquare category %s failed: %v", categoryIDs[i], r.err)
			if firstErr == nil {
				firstErr = r.err
			}
			continue
		}
		for _, c := range r.candidates {
			if !seen[c.FsqID] {
				seen[c.FsqID] = true
				all = append(all, c)
			}
		}
	}

	// If we got zero results and had errors, surface the error
	if len(all) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return all, nil
}

func (p *Planner) loadSystemPrompt() (string, error) {
	data, err := os.ReadFile("prompts/rank_v1.txt")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// buildUserPrompt creates the JSON user message with shortlisted candidates and prefs.
func (p *Planner) buildUserPrompt(shortlisted []model.ScoredCandidate, req model.ItineraryRequest) (string, error) {
	// Rating and Price omitted — premium Foursquare fields not available on free tier.
	// TODO: re-enable when premium fields available.
	type candidateForLLM struct {
		FsqID    string  `json:"fsq_id"`
		Name     string  `json:"name"`
		Category string  `json:"category"`
		Lat      float64 `json:"lat"`
		Lng      float64 `json:"lng"`
	}

	candidates := make([]candidateForLLM, len(shortlisted))
	for i, sc := range shortlisted {
		candidates[i] = candidateForLLM{
			FsqID:    sc.FsqID,
			Name:     sc.Name,
			Category: sc.Category,
			Lat:      sc.Lat,
			Lng:      sc.Lng,
		}
	}

	prompt := struct {
		Preferences model.ItineraryRequest `json:"preferences"`
		Candidates  []candidateForLLM      `json:"candidates"`
	}{
		Preferences: req,
		Candidates:  candidates,
	}

	data, err := json.Marshal(prompt)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// buildResponse merges LLM output with full candidate data to produce the API response.
func (p *Planner) buildResponse(city model.CityInfo, llmResp model.LLMItineraryResponse, shortlisted []model.ScoredCandidate) *model.ItineraryResponse {
	// Build lookup map: fsq_id → ScoredCandidate
	lookup := make(map[string]model.ScoredCandidate, len(shortlisted))
	for _, sc := range shortlisted {
		lookup[sc.FsqID] = sc
	}

	var days []model.DayPlan
	for _, llmDay := range llmResp.Days {
		day := model.DayPlan{
			DayNumber:    llmDay.DayNumber,
			Neighborhood: llmDay.Neighborhood,
			Theme:        llmDay.Theme,
		}

		for _, llmStop := range llmDay.Stops {
			sc, ok := lookup[llmStop.FsqID]
			if !ok {
				log.Printf("planner: LLM referenced unknown fsq_id %q, skipping", llmStop.FsqID)
				continue
			}
			day.Stops = append(day.Stops, model.PlaceStop{
				FsqID:       sc.FsqID,
				Name:        sc.Name,
				Latitude:    sc.Lat,
				Longitude:   sc.Lng,
				Category:    sc.Category,
				TimeSlot:    llmStop.TimeSlot,
				Description: llmStop.Description,
				Rating:      sc.Rating,
				Price:       sc.Price,
			})
		}
		days = append(days, day)
	}

	return &model.ItineraryResponse{
		City: city.Name,
		Days: days,
	}
}
