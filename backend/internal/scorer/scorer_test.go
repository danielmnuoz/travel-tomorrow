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
	w := adjustWeights(prefs)

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
	w := adjustWeights(prefs)

	sum := w.distance + w.category + w.interest + w.time + w.proximity
	if sum < 0.99 || sum > 1.01 {
		t.Errorf("default weights should sum to 1.0, got %.4f", sum)
	}
}

func TestAdjustWeights_PackedPace(t *testing.T) {
	prefs := model.ItineraryRequest{Pace: 4}
	w := adjustWeights(prefs)

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
