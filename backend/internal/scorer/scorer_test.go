package scorer

import (
	"testing"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

func TestInterestAffinity_MuseumMatchesMuseumsInterest(t *testing.T) {
	// User selected "museums" → normalized to "activity".
	// A candidate with category "activity" should score higher than one without.
	prefs := model.ItineraryRequest{
		Interests: []string{"museums"},
	}

	candidates := []model.Candidate{
		{FsqID: "museum1", Name: "Art Museum", Category: "activity", Distance: 500},
		{FsqID: "food1", Name: "Pizza Place", Category: "food", Distance: 500},
	}

	scored := Score(candidates, prefs)
	var museumScore, foodScore float64
	for _, s := range scored {
		if s.FsqID == "museum1" {
			museumScore = s.Score
		}
		if s.FsqID == "food1" {
			foodScore = s.Score
		}
	}

	if museumScore <= foodScore {
		t.Errorf("museum candidate (%.4f) should score higher than food candidate (%.4f) when user selected museums", museumScore, foodScore)
	}
}

func TestInterestAffinity_NoBoostWithoutMatch(t *testing.T) {
	// User selected "parks" → normalized to "landmark".
	// A "food" candidate gets no interest boost.
	prefs := model.ItineraryRequest{
		Interests: []string{"parks"},
	}

	cats := buildInterestCategories(prefs.Interests)
	if interestAffinity("food", cats) != 0.0 {
		t.Error("food category should have 0 affinity when user selected parks")
	}
	if interestAffinity("landmark", cats) != 1.0 {
		t.Error("landmark category should have 1.0 affinity when user selected parks")
	}
}

func TestTimeBonus_CafeHigherThanNightlife(t *testing.T) {
	// Café has max affinity 0.8 (morning), activity has 0.7 (afternoon).
	// Both are decent, but café edges out slightly.
	cafeBonus := timeBonus("cafe")
	activityBonus := timeBonus("activity")

	if cafeBonus <= activityBonus {
		t.Errorf("cafe time bonus (%.2f) should be higher than activity (%.2f)", cafeBonus, activityBonus)
	}
}

func TestTimeBonus_FoodHighest(t *testing.T) {
	// Food has max 0.9 (evening) — highest among all categories.
	foodBonus := timeBonus("food")
	if foodBonus != 0.9 {
		t.Errorf("food time bonus should be 0.9, got %.2f", foodBonus)
	}
}

func TestTimeBonus_UnknownCategory(t *testing.T) {
	bonus := timeBonus("unknown_category")
	if bonus != 0.5 {
		t.Errorf("unknown category time bonus should be 0.5, got %.2f", bonus)
	}
}

func TestProximityRescore_ClusteredOutscoreIsolated(t *testing.T) {
	prefs := model.ItineraryRequest{}

	// Two candidates near each other, one far away. All start with similar scores.
	scored := []model.ScoredCandidate{
		{Candidate: model.Candidate{FsqID: "a", Lat: 40.7128, Lng: -74.0060}, Score: 0.5},
		{Candidate: model.Candidate{FsqID: "b", Lat: 40.7130, Lng: -74.0058}, Score: 0.5},
		{Candidate: model.Candidate{FsqID: "c", Lat: 41.0000, Lng: -73.5000}, Score: 0.5}, // ~50km away
	}

	rescored := ProximityRescore(scored, prefs)

	var aScore, bScore, cScore float64
	for _, s := range rescored {
		switch s.FsqID {
		case "a":
			aScore = s.Score
		case "b":
			bScore = s.Score
		case "c":
			cScore = s.Score
		}
	}

	if aScore <= cScore {
		t.Errorf("clustered candidate a (%.4f) should outscore isolated c (%.4f)", aScore, cScore)
	}
	if bScore <= cScore {
		t.Errorf("clustered candidate b (%.4f) should outscore isolated c (%.4f)", bScore, cScore)
	}
}

func TestAdjustWeights_WalkMode(t *testing.T) {
	prefs := model.ItineraryRequest{Transport: "walk"}
	w := adjustWeights(prefs, false)

	if w.distance != 0.45 {
		t.Errorf("walk mode distance weight should be 0.45, got %.2f", w.distance)
	}
	if w.proximity != 0.15 {
		t.Errorf("walk mode proximity weight should be 0.15, got %.2f", w.proximity)
	}
	if w.interest != 0.20 {
		t.Errorf("walk mode interest weight should be 0.20, got %.2f", w.interest)
	}
}

func TestAdjustWeights_Default(t *testing.T) {
	prefs := model.ItineraryRequest{Transport: "transit"}
	w := adjustWeights(prefs, false)

	sum := w.distance + w.category + w.interest + w.time + w.proximity
	if sum < 0.99 || sum > 1.01 {
		t.Errorf("default weights should sum to 1.0, got %.4f", sum)
	}
}

func TestAdjustWeights_PackedPace(t *testing.T) {
	prefs := model.ItineraryRequest{Pace: 4}
	w := adjustWeights(prefs, false)

	if w.distance != 0.45 {
		t.Errorf("packed pace distance weight should be 0.45, got %.2f", w.distance)
	}
}

func TestHaversine(t *testing.T) {
	// NYC to a point ~1km north
	d := Haversine(40.7128, -74.0060, 40.7218, -74.0060)
	if d < 900 || d > 1100 {
		t.Errorf("expected ~1000m, got %.0fm", d)
	}
}

// --- Premium scoring tests ---

func TestRatingScore(t *testing.T) {
	tests := []struct {
		rating float64
		want   float64
	}{
		{0, 0},
		{1.0, 0},
		{3.0, 0.5},
		{5.0, 1.0},
		{-1, 0},
	}
	for _, tt := range tests {
		got := ratingScore(tt.rating)
		if got < tt.want-0.01 || got > tt.want+0.01 {
			t.Errorf("ratingScore(%.1f) = %.2f, want %.2f", tt.rating, got, tt.want)
		}
	}
}

func TestPopularityScore(t *testing.T) {
	if popularityScore(100, 200) != 0.5 {
		t.Error("100/200 should be 0.5")
	}
	if popularityScore(200, 200) != 1.0 {
		t.Error("200/200 should be 1.0")
	}
	if popularityScore(0, 200) != 0 {
		t.Error("0 reviews should be 0")
	}
	if popularityScore(100, 0) != 0 {
		t.Error("maxReviews=0 should be 0")
	}
}

func TestPriceMatchScore(t *testing.T) {
	tests := []struct {
		price, budget int
		want          float64
	}{
		{2, 2, 1.0},
		{2, 3, 0.6},
		{2, 4, 0.3},
		{1, 4, 0.0},
		{0, 2, 0.5},  // unknown price
		{2, 0, 0.5},  // unknown budget
	}
	for _, tt := range tests {
		got := priceMatchScore(tt.price, tt.budget)
		if got < tt.want-0.01 || got > tt.want+0.01 {
			t.Errorf("priceMatchScore(%d, %d) = %.2f, want %.2f", tt.price, tt.budget, got, tt.want)
		}
	}
}

func TestScore_PremiumAutoDetect(t *testing.T) {
	prefs := model.ItineraryRequest{
		Interests: []string{"food"},
		Budget:    2,
	}

	// Candidates WITH rating data → premium mode auto-detected
	candidates := []model.Candidate{
		{FsqID: "high", Name: "High Rated", Category: "food", Distance: 500, Rating: 4.8, Reviews: 500, Price: 2},
		{FsqID: "low", Name: "Low Rated", Category: "food", Distance: 500, Rating: 2.0, Reviews: 10, Price: 2},
	}

	scored := Score(candidates, prefs)
	var highScore, lowScore float64
	for _, s := range scored {
		if s.FsqID == "high" {
			highScore = s.Score
		}
		if s.FsqID == "low" {
			lowScore = s.Score
		}
	}

	if highScore <= lowScore {
		t.Errorf("high-rated candidate (%.4f) should outscore low-rated (%.4f) in premium mode", highScore, lowScore)
	}
}

func TestScore_FreeMode_IgnoresRating(t *testing.T) {
	prefs := model.ItineraryRequest{
		Interests: []string{"food"},
	}

	// No rating data → free mode. Scores should be equal (same distance, same category).
	candidates := []model.Candidate{
		{FsqID: "a", Name: "Place A", Category: "food", Distance: 500},
		{FsqID: "b", Name: "Place B", Category: "food", Distance: 500},
	}

	scored := Score(candidates, prefs)
	var aScore, bScore float64
	for _, s := range scored {
		if s.FsqID == "a" {
			aScore = s.Score
		}
		if s.FsqID == "b" {
			bScore = s.Score
		}
	}

	if aScore != bScore {
		t.Errorf("free mode: identical candidates should have equal scores, got a=%.4f b=%.4f", aScore, bScore)
	}
}

func TestAdjustWeights_Premium(t *testing.T) {
	prefs := model.ItineraryRequest{Transport: "transit"}
	w := adjustWeights(prefs, true)

	sum := w.distance + w.category + w.interest + w.time + w.proximity + w.rating + w.popularity + w.priceMatch
	if sum < 0.99 || sum > 1.01 {
		t.Errorf("premium weights should sum to 1.0, got %.4f", sum)
	}
	if w.rating != 0.25 {
		t.Errorf("premium rating weight should be 0.25, got %.2f", w.rating)
	}
}

func TestAdjustWeights_PremiumWalk(t *testing.T) {
	prefs := model.ItineraryRequest{Transport: "walk"}
	w := adjustWeights(prefs, true)

	sum := w.distance + w.category + w.interest + w.time + w.proximity + w.rating + w.popularity + w.priceMatch
	if sum < 0.99 || sum > 1.01 {
		t.Errorf("premium walk weights should sum to 1.0, got %.4f", sum)
	}
	if w.distance != 0.25 {
		t.Errorf("premium walk distance should be 0.25, got %.2f", w.distance)
	}
}
