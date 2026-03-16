package scorer

import (
	"slices"
	"sort"
	"strings"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

// Default scoring weights (5 signals).
const (
	defaultWDistance  = 0.40
	defaultWCategory = 0.15
	defaultWInterest = 0.25
	defaultWTime     = 0.10
	defaultWProximity = 0.10
)

// weights holds the five scoring weights.
type weights struct {
	distance  float64
	category  float64
	interest  float64
	time      float64
	proximity float64
}

// interestToCategory maps user-facing interest strings to normalized categories.
var interestToCategory = map[string]string{
	"museums":    "activity",
	"cafes":     "cafe",
	"parks":     "landmark",
	"food":      "food",
	"restaurant": "food",
	"shopping":  "activity",
	"nightlife": "activity",
	"history":   "landmark",
	"landmarks": "landmark",
}

// categoryTimeAffinity maps normalized categories to time-slot affinities [morning, afternoon, evening].
var categoryTimeAffinity = map[string][3]float64{
	"cafe":     {0.8, 0.5, 0.1},
	"food":     {0.2, 0.6, 0.9},
	"landmark": {0.7, 0.7, 0.2},
	"activity": {0.5, 0.7, 0.4},
}

// Score scores all candidates against the given preferences.
// Uses five signals: distance, category diversity, interest affinity, time bonus, and proximity (applied post-hoc).
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

	// 4. Build set of normalized categories the user is interested in.
	interestCats := buildInterestCategories(prefs.Interests)

	// 5. Score each candidate.
	scored := make([]model.ScoredCandidate, len(candidates))
	for i, c := range candidates {
		distScore := 1.0 - normalize(c.Distance, 0, maxDist)

		catFreq := float64(catCount[c.Category]) / totalCandidates
		diversityBonus := 1.0 - catFreq

		affinity := interestAffinity(c.Category, interestCats)
		tBonus := timeBonus(c.Category)

		s := w.distance*distScore +
			w.category*diversityBonus +
			w.interest*affinity +
			w.time*tBonus

		scored[i] = model.ScoredCandidate{
			Candidate: c,
			Score:     s,
		}
	}

	return scored
}

// ProximityRescore applies a post-scoring proximity bonus.
// It takes an oversized list, computes how close each candidate is to other
// high-scoring candidates, adds a weighted bonus, and returns the re-sorted list.
func ProximityRescore(scored []model.ScoredCandidate, prefs model.ItineraryRequest) []model.ScoredCandidate {
	if len(scored) < 2 {
		return scored
	}

	w := adjustWeights(prefs)

	const nearestK = 5

	// Compute average distance to nearest K candidates for each.
	avgDists := make([]float64, len(scored))
	maxAvg := 0.0

	for i := range scored {
		dists := make([]float64, 0, len(scored)-1)
		for j := range scored {
			if i == j {
				continue
			}
			d := Haversine(scored[i].Lat, scored[i].Lng, scored[j].Lat, scored[j].Lng)
			dists = append(dists, d)
		}
		sort.Float64s(dists)

		k := nearestK
		if k > len(dists) {
			k = len(dists)
		}
		sum := 0.0
		for _, d := range dists[:k] {
			sum += d
		}
		avgDists[i] = sum / float64(k)
		if avgDists[i] > maxAvg {
			maxAvg = avgDists[i]
		}
	}

	if maxAvg == 0 {
		maxAvg = 1.0
	}

	// Add proximity bonus: closer to other candidates = higher bonus.
	for i := range scored {
		proximityScore := 1.0 - normalize(avgDists[i], 0, maxAvg)
		scored[i].Score += w.proximity * proximityScore
	}

	// Re-sort by updated score.
	slices.SortFunc(scored, func(a, b model.ScoredCandidate) int {
		if a.Score > b.Score {
			return -1
		}
		if a.Score < b.Score {
			return 1
		}
		return 0
	})

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
		distance:  defaultWDistance,
		category:  defaultWCategory,
		interest:  defaultWInterest,
		time:      defaultWTime,
		proximity: defaultWProximity,
	}

	// Transport == "walk" or Pace >= 4 (packed): prefer clustered stops.
	if prefs.Transport == "walk" || prefs.Pace >= 4 {
		w.distance = 0.45
		w.category = 0.10
		w.interest = 0.20
		w.time = 0.10
		w.proximity = 0.15
	}

	return w
}

// buildInterestCategories maps user interests to the set of normalized categories.
func buildInterestCategories(interests []string) map[string]bool {
	cats := make(map[string]bool)
	for _, interest := range interests {
		key := strings.ToLower(strings.TrimSpace(interest))
		if cat, ok := interestToCategory[key]; ok {
			cats[cat] = true
		}
	}
	return cats
}

// interestAffinity returns 1.0 if the candidate's category matches a user interest, 0.0 otherwise.
func interestAffinity(category string, interestCats map[string]bool) float64 {
	if interestCats[strings.ToLower(category)] {
		return 1.0
	}
	return 0.0
}

// timeBonus returns the max time-slot affinity for a category.
// Categories that strongly fit at least one time slot score higher.
func timeBonus(category string) float64 {
	affinities, ok := categoryTimeAffinity[strings.ToLower(category)]
	if !ok {
		return 0.5 // neutral default for unknown categories
	}
	maxVal := affinities[0]
	for _, v := range affinities[1:] {
		if v > maxVal {
			maxVal = v
		}
	}
	return maxVal
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
