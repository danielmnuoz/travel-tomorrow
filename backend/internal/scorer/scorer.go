package scorer

import (
	"slices"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

// Default scoring weights.
const (
	defaultWDistance = 0.70
	defaultWCategory = 0.30
)

// weights holds the two scoring weights.
type weights struct {
	distance float64
	category float64
}

// Score scores all candidates against the given preferences.
// Without premium fields (rating, price, reviews), scoring uses two signals:
// distance from city center and category diversity.
func Score(candidates []model.Candidate, prefs model.ItineraryRequest) []model.ScoredCandidate {
	if len(candidates) == 0 {
		return nil
	}

	// 1. Find maxDistance among all candidates.
	maxDist := 0.0
	for _, c := range candidates {
		if c.Distance > maxDist {
			maxDist = c.Distance
		}
	}
	if maxDist == 0 {
		maxDist = 1.0
	}

	// 2. Compute adjusted weights based on prefs.
	w := adjustWeights(prefs)

	// 3. Count category frequencies for diversity bonus.
	catCount := make(map[string]int)
	for _, c := range candidates {
		catCount[c.Category]++
	}
	totalCandidates := float64(len(candidates))

	// 4. Score each candidate.
	scored := make([]model.ScoredCandidate, len(candidates))
	for i, c := range candidates {
		distScore := 1.0 - normalize(c.Distance, 0, maxDist)

		// Category diversity: rarer categories get a higher bonus.
		// A category that appears once gets ~1.0, a dominant category gets ~0.0.
		catFreq := float64(catCount[c.Category]) / totalCandidates
		diversityBonus := 1.0 - catFreq

		s := w.distance*distScore + w.category*diversityBonus

		scored[i] = model.ScoredCandidate{
			Candidate: c,
			Score:     s,
		}
	}

	return scored
}

// Shortlist returns the top N scored candidates, sorted by score descending.
func Shortlist(scored []model.ScoredCandidate, topN int) []model.ScoredCandidate {
	slices.SortFunc(scored, func(a, b model.ScoredCandidate) int {
		if a.Score > b.Score {
			return -1
		}
		if a.Score < b.Score {
			return 1
		}
		return 0
	})

	if topN >= len(scored) {
		return scored
	}
	return scored[:topN]
}

// adjustWeights returns scoring weights adjusted for user preferences.
func adjustWeights(prefs model.ItineraryRequest) weights {
	w := weights{
		distance: defaultWDistance,
		category: defaultWCategory,
	}

	// Transport == "walk" or Pace >= 4 (packed): prefer clustered stops.
	if prefs.Transport == "walk" || prefs.Pace >= 4 {
		w.distance = 0.80
		w.category = 0.20
	}

	return w
}

// TODO: re-enable when premium fields available
// func priceMatchScore(candidatePrice, userBudget int) float64 { ... }
// Add rating (W=0.30), popularity (W=0.15), price (W=0.25) weights back
// and reduce distance/category weights accordingly.

// normalize clamps value into [min, max] and returns a value in [0, 1].
func normalize(value, min, max float64) float64 {
	if max <= min {
		return 0
	}
	v := (value - min) / (max - min)
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
