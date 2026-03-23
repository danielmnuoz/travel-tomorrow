package model

// --- City Registry ---

type CityInfo struct {
	Name string
	Lat  float64
	Lng  float64
}

// NYC only for now; others added later.
var Cities = map[string]CityInfo{
	"nyc": {Name: "New York City", Lat: 40.7128, Lng: -74.0060},
}

// --- API Request / Response ---

type MustVisitPlace struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Lat      float64 `json:"latitude"`
	Lng      float64 `json:"longitude"`
	Category string  `json:"category,omitempty"`
}

type ItineraryRequest struct {
	City           string           `json:"city"`
	Days           int              `json:"days"`
	Budget         int              `json:"budget"`
	Pace           int              `json:"pace"`
	Transport      string           `json:"transport"`
	FoodStyles     []string         `json:"food_styles"`
	Interests      []string         `json:"interests"`
	Address        string           `json:"address,omitempty"`
	Neighborhoods  []string         `json:"neighborhoods,omitempty"`
	MustVisits     []MustVisitPlace `json:"must_visits,omitempty"`
	MaxFoodStops   *int             `json:"max_food_stops,omitempty"`
}

type ItineraryResponse struct {
	City string    `json:"city"`
	Days []DayPlan `json:"days"`
}

type DayPlan struct {
	DayNumber    int         `json:"day_number"`
	Neighborhood string      `json:"neighborhood"`
	Theme        string      `json:"theme"`
	Stops        []PlaceStop `json:"stops"`
}

type PlaceStop struct {
	FsqID       string  `json:"fsq_id"`
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Category    string  `json:"category"`
	TimeSlot    string  `json:"time_slot"`
	Icon        string  `json:"icon"`
	Description string  `json:"description"`
	Rating      float64 `json:"rating,omitempty"`
	Price       int     `json:"price,omitempty"`
	Pinned      bool    `json:"pinned,omitempty"`
}

// --- Refresh Stop ---

type RefreshStopRequest struct {
	Preferences ItineraryRequest `json:"preferences"`
	CurrentDay  DayPlan          `json:"current_day"`
	StopFsqID   string           `json:"stop_fsq_id"`
}

type RefreshStopResponse struct {
	NewStop PlaceStop `json:"new_stop"`
}

// --- Internal Pipeline Types ---

type Candidate struct {
	FsqID         string
	Name          string
	Lat           float64
	Lng           float64
	Category      string // normalized: "food", "cafe", "activity", "landmark"
	Rating        float64
	Reviews       int
	Price         int // 1-4, 0 if unknown
	Distance      float64
	RawCategories []string
	Neighborhood  string // which neighborhood this candidate came from (if any)
}

type ScoredCandidate struct {
	Candidate
	Score float64
}

// --- LLM Response Types ---

type LLMItineraryResponse struct {
	Days []LLMDayPlan `json:"days"`
}

type LLMDayPlan struct {
	DayNumber    int          `json:"day_number"`
	Neighborhood string       `json:"neighborhood"`
	Theme        string       `json:"theme"`
	Stops        []LLMStop    `json:"stops"`
}

type LLMStop struct {
	FsqID       string `json:"fsq_id"`
	TimeSlot    string `json:"time_slot"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
}
