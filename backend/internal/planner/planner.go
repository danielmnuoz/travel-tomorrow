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

// candidateForLLM is the trimmed candidate struct sent to the LLM.
type candidateForLLM struct {
	FsqID    string  `json:"fsq_id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

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

	// 2. Resolve search origin (hotel or city center)
	searchLat, searchLng := p.resolveSearchOrigin(ctx, req, city)

	// 3. Map interests → Foursquare category IDs
	categoryIDs := foursquare.CategoryIDsForInterests(req.Interests)

	// 4. Fetch candidates from Foursquare (parallel per category)
	candidates, err := p.fetchCandidates(ctx, searchLat, searchLng, categoryIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch candidates: %w", err)
	}
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no places found for city %q with interests %v", req.City, req.Interests)
	}

	log.Printf("planner: fetched %d candidates across %d categories", len(candidates), len(categoryIDs))

	// 5. Score & shortlist
	scored := scorer.Score(candidates, req)
	shortlisted := scorer.Shortlist(scored, shortlistSize*len(categoryIDs))

	log.Printf("planner: shortlisted %d candidates", len(shortlisted))

	// 6. Build LLM prompt
	systemPrompt, err := p.loadPrompt("prompts/rank_v1.txt")
	if err != nil {
		return nil, fmt.Errorf("load system prompt: %w", err)
	}
	userPrompt, err := p.buildUserPrompt(shortlisted, req)
	if err != nil {
		return nil, fmt.Errorf("build user prompt: %w", err)
	}

	if p.cfg.Debug {
		log.Printf("[DEBUG] planner: user prompt sent to LLM (%d bytes)", len(userPrompt))
	}

	// 7. Call LLM
	log.Printf("planner: calling LLM for ranking + narrative...")
	rawJSON, err := p.llm.Chat(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("llm chat: %w", err)
	}

	log.Printf("[DEBUG] planner: raw LLM response:\n%s", rawJSON)

	// 8. Parse LLM response
	var llmResp model.LLMItineraryResponse
	if err := json.Unmarshal([]byte(rawJSON), &llmResp); err != nil {
		return nil, fmt.Errorf("parse llm response: %w (raw: %.200s)", err, rawJSON)
	}

	// 9. Merge LLM output with full candidate data
	resp := p.buildResponse(city, llmResp, shortlisted)
	return resp, nil
}

// RefreshStop replaces a single stop in a day with a new one.
func (p *Planner) RefreshStop(ctx context.Context, req model.RefreshStopRequest) (*model.RefreshStopResponse, error) {
	// 1. Resolve city
	city, ok := model.Cities[req.Preferences.City]
	if !ok {
		return nil, fmt.Errorf("unknown city: %s", req.Preferences.City)
	}

	// 2. Find the stop to replace and build exclusion set in one pass
	var oldStop *model.PlaceStop
	excluded := make(map[string]bool, len(req.CurrentDay.Stops))
	for i := range req.CurrentDay.Stops {
		excluded[req.CurrentDay.Stops[i].FsqID] = true
		if req.CurrentDay.Stops[i].FsqID == req.StopFsqID {
			oldStop = &req.CurrentDay.Stops[i]
		}
	}
	if oldStop == nil {
		return nil, fmt.Errorf("stop %s not found in current day", req.StopFsqID)
	}

	// 3. Resolve search origin
	searchLat, searchLng := p.resolveSearchOrigin(ctx, req.Preferences, city)

	// 4. Map category → Foursquare category IDs
	categoryIDs := foursquare.CategoryIDsForCategory(oldStop.Category)
	if len(categoryIDs) == 0 {
		// Fallback: use all interests
		categoryIDs = foursquare.CategoryIDsForInterests(req.Preferences.Interests)
	}

	// 5. Fetch fresh candidates
	candidates, err := p.fetchCandidates(ctx, searchLat, searchLng, categoryIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch candidates: %w", err)
	}

	// 6. Filter out stops already in the day
	filtered := make([]model.Candidate, 0, len(candidates))
	for _, c := range candidates {
		if !excluded[c.FsqID] {
			filtered = append(filtered, c)
		}
	}
	if len(filtered) == 0 {
		return nil, fmt.Errorf("no replacement candidates available")
	}

	// 7. Score & shortlist top 5
	scored := scorer.Score(filtered, req.Preferences)
	shortlisted := scorer.Shortlist(scored, 5)

	log.Printf("planner: refresh-stop shortlisted %d candidates for category %q", len(shortlisted), oldStop.Category)

	// 8. Build focused LLM prompt
	systemPrompt, err := p.loadPrompt("prompts/refresh_v1.txt")
	if err != nil {
		return nil, fmt.Errorf("load refresh prompt: %w", err)
	}
	userPrompt, err := p.buildRefreshUserPrompt(shortlisted, req, oldStop)
	if err != nil {
		return nil, fmt.Errorf("build refresh user prompt: %w", err)
	}

	// 9. Call LLM
	log.Printf("planner: calling LLM for stop replacement...")
	rawJSON, err := p.llm.Chat(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("llm chat: %w", err)
	}

	log.Printf("[DEBUG] planner: raw refresh LLM response:\n%s", rawJSON)

	// 10. Parse single-stop LLM response
	var llmStop model.LLMStop
	if err := json.Unmarshal([]byte(rawJSON), &llmStop); err != nil {
		return nil, fmt.Errorf("parse refresh llm response: %w (raw: %.200s)", err, rawJSON)
	}

	// 11. Merge with candidate data
	newStop := mergePlaceStop(llmStop, shortlisted)
	if newStop == nil {
		return nil, fmt.Errorf("LLM selected unknown fsq_id %q", llmStop.FsqID)
	}

	return &model.RefreshStopResponse{NewStop: *newStop}, nil
}

// resolveSearchOrigin returns the lat/lng to use as search center.
// If the user specified a hotel and it can be geocoded, use the hotel coords.
// Otherwise, fall back to city center.
func (p *Planner) resolveSearchOrigin(ctx context.Context, req model.ItineraryRequest, city model.CityInfo) (float64, float64) {
	if req.Hotel == "" {
		return city.Lat, city.Lng
	}

	results, err := p.fsq.SearchByName(ctx, req.Hotel, city.Lat, city.Lng, 1)
	if err != nil || len(results) == 0 {
		log.Printf("planner: hotel resolution failed for %q, using city center", req.Hotel)
		return city.Lat, city.Lng
	}

	h := results[0]
	log.Printf("planner: hotel resolved %q → %q (lat=%.5f, lng=%.5f, dist=%.0fm, categories=%v)",
		req.Hotel, h.Name, h.Lat, h.Lng, h.Distance, h.RawCategories)
	return h.Lat, h.Lng
}

// fetchCandidates calls Foursquare for each category in parallel and deduplicates.
func (p *Planner) fetchCandidates(ctx context.Context, lat, lng float64, categoryIDs []string) ([]model.Candidate, error) {
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
			c, err := p.fsq.SearchPlaces(ctx, lat, lng, p.cfg.SearchRadius, []string{id}, 15)
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

func (p *Planner) loadPrompt(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// shortlistedToCandidates converts scored candidates to the trimmed LLM format.
func shortlistedToCandidates(shortlisted []model.ScoredCandidate) []candidateForLLM {
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
	return candidates
}

// buildPlaceStop merges an LLM stop pick with candidate data to produce a PlaceStop.
func buildPlaceStop(llmStop model.LLMStop, sc model.ScoredCandidate) model.PlaceStop {
	return model.PlaceStop{
		FsqID:       sc.FsqID,
		Name:        sc.Name,
		Latitude:    sc.Lat,
		Longitude:   sc.Lng,
		Category:    sc.Category,
		TimeSlot:    llmStop.TimeSlot,
		Icon:        llmStop.Icon,
		Description: llmStop.Description,
		Rating:      sc.Rating,
		Price:       sc.Price,
	}
}

// mergePlaceStop finds the matching candidate for an LLM stop and merges them.
func mergePlaceStop(llmStop model.LLMStop, shortlisted []model.ScoredCandidate) *model.PlaceStop {
	for _, sc := range shortlisted {
		if sc.FsqID == llmStop.FsqID {
			ps := buildPlaceStop(llmStop, sc)
			return &ps
		}
	}
	return nil
}

// buildUserPrompt creates the JSON user message with shortlisted candidates and prefs.
func (p *Planner) buildUserPrompt(shortlisted []model.ScoredCandidate, req model.ItineraryRequest) (string, error) {
	prompt := struct {
		Preferences model.ItineraryRequest `json:"preferences"`
		Candidates  []candidateForLLM      `json:"candidates"`
	}{
		Preferences: req,
		Candidates:  shortlistedToCandidates(shortlisted),
	}

	data, err := json.Marshal(prompt)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// buildRefreshUserPrompt creates the JSON prompt for single-stop replacement.
func (p *Planner) buildRefreshUserPrompt(shortlisted []model.ScoredCandidate, req model.RefreshStopRequest, oldStop *model.PlaceStop) (string, error) {
	type existingStop struct {
		Name     string `json:"name"`
		Category string `json:"category"`
		TimeSlot string `json:"time_slot"`
	}

	existing := make([]existingStop, 0, len(req.CurrentDay.Stops))
	for _, s := range req.CurrentDay.Stops {
		if s.FsqID != req.StopFsqID {
			existing = append(existing, existingStop{
				Name:     s.Name,
				Category: s.Category,
				TimeSlot: s.TimeSlot,
			})
		}
	}

	prompt := struct {
		Preferences     model.ItineraryRequest `json:"preferences"`
		ReplaceTimeSlot string                 `json:"replace_time_slot"`
		ReplaceCategory string                 `json:"replace_category"`
		ExistingStops   []existingStop         `json:"existing_stops"`
		Candidates      []candidateForLLM      `json:"candidates"`
	}{
		Preferences:     req.Preferences,
		ReplaceTimeSlot: oldStop.TimeSlot,
		ReplaceCategory: oldStop.Category,
		ExistingStops:   existing,
		Candidates:      shortlistedToCandidates(shortlisted),
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
			day.Stops = append(day.Stops, buildPlaceStop(llmStop, sc))
		}
		days = append(days, day)
	}

	return &model.ItineraryResponse{
		City: city.Name,
		Days: days,
	}
}
