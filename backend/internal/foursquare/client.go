package foursquare

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

const placesSearchURL = "https://places-api.foursquare.com/places/search"

// interestToCategories maps user-facing interest strings to Foursquare BSON
// category IDs (the new API ignores old numeric IDs).
var interestToCategories = map[string][]string{
	"food":       {"4d4b7105d754a06374d81259"},                           // Restaurant (top-level)
	"restaurant": {"4d4b7105d754a06374d81259"},                           // Restaurant (top-level)
	"cafes":      {"4bf58dd8d48988d1e0931735", "4bf58dd8d48988d16d941735"}, // Coffee Shop, Café
	"museums":    {"4bf58dd8d48988d181941735"},                           // Museum
	"parks":      {"4bf58dd8d48988d163941735"},                           // Park
	"shopping":   {"4bf58dd8d48988d1fd941735"},                           // Shopping Mall
	"nightlife":  {"4bf58dd8d48988d11f941735"},                           // Night Club
	"history":    {"4d4b7105d754a06377d81259"},                           // Landmarks and Outdoors (top-level)
	"landmarks":  {"4d4b7105d754a06377d81259", "4bf58dd8d48988d12d941735"}, // Landmarks and Outdoors, Monument
}

// categoryToFsqIDs maps normalized category strings back to Foursquare category IDs.
var categoryToFsqIDs = map[string][]string{
	"food":     {"4d4b7105d754a06374d81259"},                           // Restaurant (top-level)
	"cafe":     {"4bf58dd8d48988d1e0931735", "4bf58dd8d48988d16d941735"}, // Coffee Shop, Café
	"activity": {"4bf58dd8d48988d181941735", "4bf58dd8d48988d1fd941735", "4bf58dd8d48988d11f941735"}, // Museum, Shopping, Nightclub
	"landmark": {"4d4b7105d754a06377d81259", "4bf58dd8d48988d12d941735", "4bf58dd8d48988d163941735"}, // Landmarks, Monument, Park
}

// CategoryIDsForInterests maps a list of user interest strings to Foursquare
// category IDs. The "food" category (13065) is always included. The returned
// slice is deduplicated.
func CategoryIDsForInterests(interests []string) []string {
	const defaultFood = "4d4b7105d754a06374d81259" // Restaurant (top-level)
	seen := map[string]bool{defaultFood: true}
	ids := []string{defaultFood}

	for _, interest := range interests {
		key := strings.ToLower(strings.TrimSpace(interest))
		cats, ok := interestToCategories[key]
		if !ok {
			continue
		}
		for _, id := range cats {
			if !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
	}
	return ids
}

// CategoryIDsForCategory maps a normalized category string (food, cafe, activity, landmark)
// to Foursquare category IDs. Returns nil if category is unknown.
func CategoryIDsForCategory(category string) []string {
	return categoryToFsqIDs[strings.ToLower(category)]
}

// PlaceMatch holds the result of a place name+coordinate match.
type PlaceMatch struct {
	FsqID         string
	Name          string
	Category      string   // normalized: "food", "cafe", "activity", "landmark"
	RawCategories []string // original Foursquare category names
}

// PlaceSearcher is the interface for searching places. *Client satisfies it.
type PlaceSearcher interface {
	SearchPlaces(ctx context.Context, lat, lng float64, radius int, categoryIDs []string, limit int) ([]model.Candidate, error)
	MatchPlace(ctx context.Context, name string, lat, lng float64) (*PlaceMatch, error)
}

// Client wraps the Foursquare Places API.
type Client struct {
	apiKey     string
	httpClient *http.Client
	debug      bool
	payAPI     bool
}

// NewClient creates a new Foursquare API client. If httpClient is nil,
// http.DefaultClient is used. When payAPI is true, premium fields (rating,
// price, photos) are requested.
func NewClient(apiKey string, httpClient *http.Client, debug bool, payAPI bool) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{
		apiKey:     apiKey,
		httpClient: httpClient,
		debug:      debug,
		payAPI:     payAPI,
	}
}

// SearchPlaces queries the Foursquare Places API for venues near the given
// coordinates, filtered by category IDs. It returns up to `limit` candidates.
func (c *Client) SearchPlaces(ctx context.Context, lat, lng float64, radius int, categoryIDs []string, limit int) ([]model.Candidate, error) {
	params := url.Values{}
	params.Set("ll", fmt.Sprintf("%f,%f", lat, lng))
	params.Set("radius", strconv.Itoa(radius))
	params.Set("fsq_category_ids", strings.Join(categoryIDs, ","))
	params.Set("limit", strconv.Itoa(limit))

	return c.doSearch(ctx, params)
}

// MatchPlace searches Foursquare by name near given coordinates to resolve
// a place's category. Uses a tight 200m radius and returns the best match.
func (c *Client) MatchPlace(ctx context.Context, name string, lat, lng float64) (*PlaceMatch, error) {
	params := url.Values{}
	params.Set("query", name)
	params.Set("ll", fmt.Sprintf("%f,%f", lat, lng))
	params.Set("radius", "200")
	params.Set("limit", "1")

	candidates, err := c.doSearch(ctx, params)
	if err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return nil, nil // no match found
	}

	best := candidates[0]
	return &PlaceMatch{
		FsqID:         best.FsqID,
		Name:          best.Name,
		Category:      best.Category,
		RawCategories: best.RawCategories,
	}, nil
}

// doSearch executes a Foursquare Places Search request with the given params.
func (c *Client) doSearch(ctx context.Context, params url.Values) ([]model.Candidate, error) {
	if c.payAPI {
		// TODO: request premium Foursquare fields (rating, price, photos, tips)
		// params.Set("fields", "fsq_place_id,name,latitude,longitude,distance,categories,rating,price,photos,tips")
		_ = c.payAPI // suppress unused hint until premium fields are wired up
	}

	reqURL := placesSearchURL + "?" + params.Encode()

	if c.debug {
		log.Printf("[DEBUG] foursquare: request URL: %s", reqURL)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("foursquare: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("X-Places-Api-Version", "2025-06-17")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("foursquare: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("foursquare: unexpected status %d", resp.StatusCode)
	}

	var body fsqResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("foursquare: decode response: %w", err)
	}

	if c.debug {
		queryInfo := params.Get("query")
		if queryInfo == "" {
			queryInfo = params.Get("fsq_category_ids")
		}
		log.Printf("[DEBUG] foursquare: query=%s returned %d results", queryInfo, len(body.Results))
		for i, r := range body.Results {
			catNames := make([]string, len(r.Categories))
			for j, cat := range r.Categories {
				catNames[j] = cat.Name
			}
			log.Printf("[DEBUG] foursquare:   [%d] %s (%s) lat=%.5f lng=%.5f dist=%.0fm",
				i, r.Name, strings.Join(catNames, ", "), r.Latitude, r.Longitude, r.Distance)
		}
	}

	candidates := make([]model.Candidate, 0, len(body.Results))
	for _, r := range body.Results {
		category := "activity"
		rawCategories := make([]string, 0, len(r.Categories))
		for _, cat := range r.Categories {
			rawCategories = append(rawCategories, cat.Name)
			if len(rawCategories) == 1 {
				category = normalizeCategoryByName(cat.Name)
			}
		}

		candidates = append(candidates, model.Candidate{
			FsqID:         r.FsqPlaceID,
			Name:          r.Name,
			Lat:           r.Latitude,
			Lng:           r.Longitude,
			Category:      category,
			Distance:      r.Distance,
			RawCategories: rawCategories,
		})
	}
	return candidates, nil
}

// ---------------------------------------------------------------------------
// Foursquare JSON response structs (new API)
// ---------------------------------------------------------------------------

type fsqResponse struct {
	Results []fsqPlace `json:"results"`
}

type fsqPlace struct {
	FsqPlaceID string        `json:"fsq_place_id"`
	Name       string        `json:"name"`
	Latitude   float64       `json:"latitude"`
	Longitude  float64       `json:"longitude"`
	Distance   float64       `json:"distance"`
	Categories []fsqCategory `json:"categories"`
}

type fsqCategory struct {
	ID   string `json:"fsq_category_id"`
	Name string `json:"name"`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// normalizeCategoryByName maps a Foursquare category name to one of our
// normalized category strings: "food", "cafe", "activity", or "landmark".
func normalizeCategoryByName(name string) string {
	lower := strings.ToLower(name)

	// Cafe / coffee
	if strings.Contains(lower, "coffee") || strings.Contains(lower, "café") ||
		strings.Contains(lower, "cafe") || strings.Contains(lower, "tea") {
		return "cafe"
	}

	// Food / restaurant
	if strings.Contains(lower, "restaurant") || strings.Contains(lower, "food") ||
		strings.Contains(lower, "pizza") || strings.Contains(lower, "burger") ||
		strings.Contains(lower, "bakery") || strings.Contains(lower, "diner") ||
		strings.Contains(lower, "bistro") || strings.Contains(lower, "bar") ||
		strings.Contains(lower, "grill") || strings.Contains(lower, "sushi") ||
		strings.Contains(lower, "noodle") || strings.Contains(lower, "taco") {
		return "food"
	}

	// Landmark / outdoors
	if strings.Contains(lower, "park") || strings.Contains(lower, "garden") ||
		strings.Contains(lower, "monument") || strings.Contains(lower, "memorial") ||
		strings.Contains(lower, "bridge") || strings.Contains(lower, "plaza") ||
		strings.Contains(lower, "square") || strings.Contains(lower, "historic") ||
		strings.Contains(lower, "church") || strings.Contains(lower, "temple") ||
		strings.Contains(lower, "scenic") {
		return "landmark"
	}

	// Activity (museums, shopping, nightlife, etc.) is the default
	return "activity"
}
