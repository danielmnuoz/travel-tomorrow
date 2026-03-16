package planner

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"sync"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/config"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/foursquare"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/geocoder"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/llm"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/scorer"
)

const shortlistSize = 8

// candidateForLLM is the trimmed candidate struct sent to the LLM.
type candidateForLLM struct {
	FsqID        string  `json:"fsq_id"`
	Name         string  `json:"name"`
	Category     string  `json:"category"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	Neighborhood string  `json:"neighborhood,omitempty"`
}

const neighborhoodSearchRadius = 1500 // meters — tighter radius for neighborhood-scoped searches

type Planner struct {
	fsq      foursquare.PlaceSearcher
	llm      *llm.Client
	cfg      *config.Config
	geocoder geocoder.Geocoder
}

func New(fsq foursquare.PlaceSearcher, llmClient *llm.Client, cfg *config.Config, geo geocoder.Geocoder) *Planner {
	return &Planner{fsq: fsq, llm: llmClient, cfg: cfg, geocoder: geo}
}

func (p *Planner) Plan(ctx context.Context, req model.ItineraryRequest) (*model.ItineraryResponse, error) {
	// 1. Resolve city
	city, ok := model.Cities[req.City]
	if !ok {
		return nil, fmt.Errorf("unknown city: %s", req.City)
	}

	// 2. Map interests → Foursquare category IDs
	categoryIDs := foursquare.CategoryIDsForInterests(req.Interests)

	// 3. Fetch candidates — neighborhood-scoped or city-wide
	var candidates []model.Candidate
	var resolvedNeighborhoods []model.Neighborhood
	var neighborhoodGroups [][]model.Neighborhood

	if len(req.Neighborhoods) > 0 {
		resolvedNeighborhoods = resolveNeighborhoods(req.City, req.Neighborhoods)
		if len(resolvedNeighborhoods) == 0 {
			return nil, fmt.Errorf("no valid neighborhoods found for city %q", req.City)
		}

		var err error
		candidates, err = p.fetchCandidatesForNeighborhoods(ctx, resolvedNeighborhoods, categoryIDs)
		if err != nil {
			return nil, fmt.Errorf("fetch neighborhood candidates: %w", err)
		}

		neighborhoodGroups = groupNeighborhoods(resolvedNeighborhoods, req.Days)
		log.Printf("planner: grouped %d neighborhoods into %d day-groups", len(resolvedNeighborhoods), len(neighborhoodGroups))
	} else {
		searchLat, searchLng := p.resolveSearchOrigin(ctx, req, city)
		var err error
		candidates, err = p.fetchCandidates(ctx, searchLat, searchLng, categoryIDs)
		if err != nil {
			return nil, fmt.Errorf("fetch candidates: %w", err)
		}
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("no places found for city %q with interests %v", req.City, req.Interests)
	}

	log.Printf("planner: fetched %d candidates across %d categories", len(candidates), len(categoryIDs))

	// 4. Score & shortlist
	scored := scorer.Score(candidates, req)
	shortlisted := scorer.Shortlist(scored, shortlistSize*len(categoryIDs))

	log.Printf("planner: shortlisted %d candidates", len(shortlisted))

	// 4b. Inject must-visit stops as high-score candidates
	for _, mv := range req.MustVisits {
		shortlisted = append(shortlisted, model.ScoredCandidate{
			Candidate: model.Candidate{
				FsqID:    mv.ID,
				Name:     mv.Name,
				Lat:      mv.Lat,
				Lng:      mv.Lng,
				Category: "activity",
			},
			Score: 1000, // ensure inclusion
		})
	}

	// 4c. Cluster pinned stops by geographic proximity
	var pinnedGroups [][]model.MustVisitPlace
	if len(req.MustVisits) > 0 {
		pinnedGroups = groupMustVisits(req.MustVisits, req.Days)
		log.Printf("planner: grouped %d pinned stops into %d day-groups", len(req.MustVisits), len(pinnedGroups))
	}

	// 5. Build LLM prompt
	systemPrompt, err := p.loadPrompt("prompts/rank_v1.txt")
	if err != nil {
		return nil, fmt.Errorf("load system prompt: %w", err)
	}

	// Append neighborhood instructions if applicable
	if len(resolvedNeighborhoods) > 0 {
		systemPrompt += neighborhoodPromptSuffix
	}

	// Append pinned-grouping instructions if applicable
	if len(pinnedGroups) > 0 {
		systemPrompt += pinnedGroupPromptSuffix
	}

	userPrompt, err := p.buildUserPrompt(shortlisted, req, neighborhoodGroups, pinnedGroups)
	if err != nil {
		return nil, fmt.Errorf("build user prompt: %w", err)
	}

	if p.cfg.Debug {
		log.Printf("[DEBUG] planner: user prompt sent to LLM (%d bytes)", len(userPrompt))
	}

	// 6. Call LLM
	log.Printf("planner: calling LLM for ranking + narrative...")
	rawJSON, err := p.llm.Chat(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("llm chat: %w", err)
	}

	log.Printf("[DEBUG] planner: raw LLM response:\n%s", rawJSON)

	// 7. Parse LLM response
	var llmResp model.LLMItineraryResponse
	if err := json.Unmarshal([]byte(rawJSON), &llmResp); err != nil {
		return nil, fmt.Errorf("parse llm response: %w (raw: %.200s)", err, rawJSON)
	}

	// 8. Merge LLM output with full candidate data
	resp := p.buildResponse(city, llmResp, shortlisted, req.MustVisits)
	return resp, nil
}

// RefreshStop replaces a single stop in a day with a new one.
func (p *Planner) RefreshStop(ctx context.Context, req model.RefreshStopRequest) (*model.RefreshStopResponse, error) {
	// Guard: cannot refresh a pinned stop
	if strings.HasPrefix(req.StopFsqID, "pinned-") {
		return nil, fmt.Errorf("cannot refresh a pinned stop")
	}

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
// If the user specified an address and it can be geocoded, use those coords.
// Otherwise, fall back to city center.
func (p *Planner) resolveSearchOrigin(ctx context.Context, req model.ItineraryRequest, city model.CityInfo) (float64, float64) {
	if req.Address == "" {
		return city.Lat, city.Lng
	}

	lat, lng, err := p.geocoder.Geocode(ctx, req.Address)
	if err != nil {
		log.Printf("planner: address geocoding failed for %q, using city center: %v", req.Address, err)
		return city.Lat, city.Lng
	}

	log.Printf("planner: address resolved %q → (lat=%.5f, lng=%.5f)", req.Address, lat, lng)
	return lat, lng
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
			FsqID:        sc.FsqID,
			Name:         sc.Name,
			Category:     sc.Category,
			Lat:          sc.Lat,
			Lng:          sc.Lng,
			Neighborhood: sc.Neighborhood,
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

// neighborhoodAssignment describes which neighborhoods are grouped into a day for the LLM.
type neighborhoodAssignment struct {
	Day           int      `json:"day"`
	Neighborhoods []string `json:"neighborhoods"`
}

// pinnedDayGroup tells the LLM which pinned stops must be on the same day.
type pinnedDayGroup struct {
	PinnedIDs []string `json:"pinned_ids"`
}

// buildUserPrompt creates the JSON user message with shortlisted candidates and prefs.
func (p *Planner) buildUserPrompt(shortlisted []model.ScoredCandidate, req model.ItineraryRequest, neighborhoodGroups [][]model.Neighborhood, pinnedGroups [][]model.MustVisitPlace) (string, error) {
	// Collect pinned IDs
	var pinnedIDs []string
	for _, mv := range req.MustVisits {
		pinnedIDs = append(pinnedIDs, mv.ID)
	}

	// Build pinned day groups for the prompt
	var pdGroups []pinnedDayGroup
	for _, group := range pinnedGroups {
		if len(group) < 2 {
			continue // solo pinned stops don't need grouping instructions
		}
		ids := make([]string, len(group))
		for i, mv := range group {
			ids[i] = mv.ID
		}
		pdGroups = append(pdGroups, pinnedDayGroup{PinnedIDs: ids})
	}

	if len(neighborhoodGroups) > 0 {
		assignments := make([]neighborhoodAssignment, len(neighborhoodGroups))
		for i, group := range neighborhoodGroups {
			names := make([]string, len(group))
			for j, n := range group {
				names[j] = n.Name
			}
			assignments[i] = neighborhoodAssignment{Day: i + 1, Neighborhoods: names}
		}

		prompt := struct {
			Preferences              model.ItineraryRequest   `json:"preferences"`
			Candidates               []candidateForLLM        `json:"candidates"`
			NeighborhoodAssignments  []neighborhoodAssignment `json:"neighborhood_assignments"`
			PinnedIDs                []string                 `json:"pinned_ids,omitempty"`
			PinnedDayGroups          []pinnedDayGroup         `json:"pinned_day_groups,omitempty"`
		}{
			Preferences:             req,
			Candidates:              shortlistedToCandidates(shortlisted),
			NeighborhoodAssignments: assignments,
			PinnedIDs:               pinnedIDs,
			PinnedDayGroups:         pdGroups,
		}

		data, err := json.Marshal(prompt)
		if err != nil {
			return "", err
		}
		return string(data), nil
	}

	prompt := struct {
		Preferences     model.ItineraryRequest `json:"preferences"`
		Candidates      []candidateForLLM      `json:"candidates"`
		PinnedIDs       []string               `json:"pinned_ids,omitempty"`
		PinnedDayGroups []pinnedDayGroup       `json:"pinned_day_groups,omitempty"`
	}{
		Preferences:     req,
		Candidates:      shortlistedToCandidates(shortlisted),
		PinnedIDs:       pinnedIDs,
		PinnedDayGroups: pdGroups,
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
func (p *Planner) buildResponse(city model.CityInfo, llmResp model.LLMItineraryResponse, shortlisted []model.ScoredCandidate, mustVisits []model.MustVisitPlace) *model.ItineraryResponse {
	// Build lookup map: fsq_id → ScoredCandidate
	lookup := make(map[string]model.ScoredCandidate, len(shortlisted))
	for _, sc := range shortlisted {
		lookup[sc.FsqID] = sc
	}

	// Build lookup for must-visit places
	pinnedLookup := make(map[string]model.MustVisitPlace, len(mustVisits))
	for _, mv := range mustVisits {
		pinnedLookup[mv.ID] = mv
	}

	var days []model.DayPlan
	for _, llmDay := range llmResp.Days {
		day := model.DayPlan{
			DayNumber:    llmDay.DayNumber,
			Neighborhood: llmDay.Neighborhood,
			Theme:        llmDay.Theme,
		}

		for _, llmStop := range llmDay.Stops {
			// Check if this is a pinned stop
			if strings.HasPrefix(llmStop.FsqID, "pinned-") {
				if mv, ok := pinnedLookup[llmStop.FsqID]; ok {
					day.Stops = append(day.Stops, model.PlaceStop{
						FsqID:       mv.ID,
						Name:        mv.Name,
						Latitude:    mv.Lat,
						Longitude:   mv.Lng,
						Category:    "activity",
						TimeSlot:    llmStop.TimeSlot,
						Icon:        llmStop.Icon,
						Description: llmStop.Description,
						Pinned:      true,
					})
					continue
				}
			}

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

// --- Neighborhood helpers ---

const neighborhoodPromptSuffix = `

Additional instructions for neighborhood-based itineraries:
- The user selected specific neighborhoods. The "neighborhood_assignments" field maps days to neighborhoods.
- Assign candidates to the day matching their neighborhood (use each candidate's "neighborhood" field).
- Each day's "neighborhood" field should be the assigned neighborhood name(s).
- If a day has multiple neighborhoods grouped together, combine them in the neighborhood field (e.g. "SoHo & Tribeca").
- For days without assigned neighborhoods, use any remaining candidates and group geographically.
`

// resolveNeighborhoods looks up neighborhood slugs from the curated data for a city.
func resolveNeighborhoods(citySlug string, slugs []string) []model.Neighborhood {
	cityNeighborhoods, ok := model.Neighborhoods[citySlug]
	if !ok {
		return nil
	}

	lookup := make(map[string]model.Neighborhood, len(cityNeighborhoods))
	for _, n := range cityNeighborhoods {
		lookup[n.ID] = n
	}

	var resolved []model.Neighborhood
	for _, slug := range slugs {
		if n, ok := lookup[slug]; ok {
			resolved = append(resolved, n)
		} else {
			log.Printf("planner: unknown neighborhood slug %q for city %q, skipping", slug, citySlug)
		}
	}
	return resolved
}

// fetchCandidatesForNeighborhoods calls fetchCandidates once per neighborhood center
// with a tighter radius, tags each candidate with its source neighborhood, and deduplicates.
func (p *Planner) fetchCandidatesForNeighborhoods(ctx context.Context, neighborhoods []model.Neighborhood, categoryIDs []string) ([]model.Candidate, error) {
	type result struct {
		candidates []model.Candidate
		hood       model.Neighborhood
		err        error
	}

	results := make([]result, len(neighborhoods))
	var wg sync.WaitGroup

	for i, hood := range neighborhoods {
		wg.Add(1)
		go func(idx int, h model.Neighborhood) {
			defer wg.Done()
			c, err := p.fetchCandidatesWithRadius(ctx, h.Lat, h.Lng, categoryIDs, neighborhoodSearchRadius)
			results[idx] = result{candidates: c, hood: h, err: err}
		}(i, hood)
	}
	wg.Wait()

	seen := make(map[string]bool)
	var all []model.Candidate
	var firstErr error

	for _, r := range results {
		if r.err != nil {
			log.Printf("planner: neighborhood %q fetch failed: %v", r.hood.Name, r.err)
			if firstErr == nil {
				firstErr = r.err
			}
			continue
		}
		for _, c := range r.candidates {
			if !seen[c.FsqID] {
				seen[c.FsqID] = true
				c.Neighborhood = r.hood.Name
				all = append(all, c)
			}
		}
	}

	if len(all) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return all, nil
}

// fetchCandidatesWithRadius is like fetchCandidates but with a custom radius.
func (p *Planner) fetchCandidatesWithRadius(ctx context.Context, lat, lng float64, categoryIDs []string, radius int) ([]model.Candidate, error) {
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
			c, err := p.fsq.SearchPlaces(ctx, lat, lng, radius, []string{id}, 15)
			results[idx] = result{candidates: c, err: err}
		}(i, catID)
	}
	wg.Wait()

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

	if len(all) == 0 && firstErr != nil {
		return nil, firstErr
	}
	return all, nil
}

// groupNeighborhoods assigns neighborhoods to days.
// If neighborhoods <= days: one per day, remaining days are unconstrained.
// If neighborhoods > days: greedy nearest-neighbor merge until we have `days` groups.
func groupNeighborhoods(neighborhoods []model.Neighborhood, days int) [][]model.Neighborhood {
	if len(neighborhoods) == 0 {
		return nil
	}

	// Start with each neighborhood in its own group
	groups := make([][]model.Neighborhood, len(neighborhoods))
	for i, n := range neighborhoods {
		groups[i] = []model.Neighborhood{n}
	}

	// Merge closest groups until we have at most `days` groups
	for len(groups) > days {
		// Find the two closest groups
		minDist := math.MaxFloat64
		mergeA, mergeB := 0, 1
		for i := 0; i < len(groups); i++ {
			for j := i + 1; j < len(groups); j++ {
				d := groupDistance(groups[i], groups[j])
				if d < minDist {
					minDist = d
					mergeA, mergeB = i, j
				}
			}
		}
		// Merge B into A, remove B
		groups[mergeA] = append(groups[mergeA], groups[mergeB]...)
		groups = append(groups[:mergeB], groups[mergeB+1:]...)
	}

	return groups
}

// groupDistance returns the minimum distance between any two neighborhoods across two groups.
func groupDistance(a, b []model.Neighborhood) float64 {
	minDist := math.MaxFloat64
	for _, na := range a {
		for _, nb := range b {
			d := haversine(na.Lat, na.Lng, nb.Lat, nb.Lng)
			if d < minDist {
				minDist = d
			}
		}
	}
	return minDist
}

// --- Pinned stop helpers ---

const pinnedGroupPromptSuffix = `

Additional instructions for pinned stop grouping:
- The "pinned_day_groups" field lists groups of pinned stops that are geographically close together.
- All pinned stops within the same group MUST be scheduled on the SAME day.
- You choose which day number and time slots for each group.
- Fill in the rest of the day with nearby non-pinned candidates.
- Solo pinned stops (not in any group) can be placed on any day that makes geographic sense.
`

// groupMustVisits clusters pinned stops by geographic proximity, merging the closest
// groups until we have at most `days` groups. Same algorithm as groupNeighborhoods.
func groupMustVisits(mustVisits []model.MustVisitPlace, days int) [][]model.MustVisitPlace {
	if len(mustVisits) == 0 {
		return nil
	}

	// Start with each pinned stop in its own group
	groups := make([][]model.MustVisitPlace, len(mustVisits))
	for i, mv := range mustVisits {
		groups[i] = []model.MustVisitPlace{mv}
	}

	// Merge closest groups until we have at most `days` groups
	for len(groups) > days {
		minDist := math.MaxFloat64
		mergeA, mergeB := 0, 1
		for i := 0; i < len(groups); i++ {
			for j := i + 1; j < len(groups); j++ {
				d := mustVisitGroupDistance(groups[i], groups[j])
				if d < minDist {
					minDist = d
					mergeA, mergeB = i, j
				}
			}
		}
		groups[mergeA] = append(groups[mergeA], groups[mergeB]...)
		groups = append(groups[:mergeB], groups[mergeB+1:]...)
	}

	// Also merge groups that are within walking distance (1500m) even if we have room for more days.
	// This ensures geographically close pins always land on the same day.
	merged := true
	for merged {
		merged = false
		for i := 0; i < len(groups); i++ {
			for j := i + 1; j < len(groups); j++ {
				if mustVisitGroupDistance(groups[i], groups[j]) < 1500 {
					groups[i] = append(groups[i], groups[j]...)
					groups = append(groups[:j], groups[j+1:]...)
					merged = true
					break
				}
			}
			if merged {
				break
			}
		}
	}

	return groups
}

// mustVisitGroupDistance returns the minimum distance between any two stops across two groups.
func mustVisitGroupDistance(a, b []model.MustVisitPlace) float64 {
	minDist := math.MaxFloat64
	for _, ma := range a {
		for _, mb := range b {
			d := haversine(ma.Lat, ma.Lng, mb.Lat, mb.Lng)
			if d < minDist {
				minDist = d
			}
		}
	}
	return minDist
}

// haversine returns the distance in meters between two lat/lng points.
func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000 // Earth radius in meters
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
