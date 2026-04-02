package google

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
)

const (
	nearbySearchURL = "https://places.googleapis.com/v1/places:searchNearby"
	textSearchURL   = "https://places.googleapis.com/v1/places:searchText"
)

// interestToTypes maps user-facing interest strings to Google Places types.
var interestToTypes = map[string][]string{
	"food":       {"restaurant"},
	"restaurant": {"restaurant"},
	"cafes":      {"cafe"},
	"museums":    {"museum"},
	"parks":      {"park"},
	"shopping":   {"shopping_mall", "clothing_store"},
	"nightlife":  {"night_club", "bar"},
	"history":    {"tourist_attraction", "church", "historical_landmark"},
	"landmarks":  {"tourist_attraction", "church", "historical_landmark"},
}

// categoryToTypes maps normalized categories to Google Places types.
var categoryToTypes = map[string][]string{
	"food":     {"restaurant"},
	"cafe":     {"cafe"},
	"activity": {"museum", "shopping_mall", "night_club"},
	"landmark": {"tourist_attraction", "park", "historical_landmark"},
}

// Client implements model.PlaceSearcher using Google Places API (New).
type Client struct {
	apiKey     string
	httpClient *http.Client
	debug      bool
}

// NewClient creates a new Google Places API client.
func NewClient(apiKey string, httpClient *http.Client, debug bool) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{
		apiKey:     apiKey,
		httpClient: httpClient,
		debug:      debug,
	}
}

// CategoryIDsForInterests maps user interests to Google Places types.
// Always includes "restaurant" as default.
func (c *Client) CategoryIDsForInterests(interests []string) []string {
	seen := map[string]bool{"restaurant": true}
	types := []string{"restaurant"}

	for _, interest := range interests {
		key := strings.ToLower(strings.TrimSpace(interest))
		ts, ok := interestToTypes[key]
		if !ok {
			continue
		}
		for _, t := range ts {
			if !seen[t] {
				seen[t] = true
				types = append(types, t)
			}
		}
	}
	return types
}

// CategoryIDsForCategory maps a normalized category to Google Places types.
func (c *Client) CategoryIDsForCategory(category string) []string {
	return categoryToTypes[strings.ToLower(category)]
}

// SearchPlaces calls Google Places Nearby Search (New).
func (c *Client) SearchPlaces(ctx context.Context, lat, lng float64, radius int, categoryIDs []string, limit int) ([]model.Candidate, error) {
	if limit > 20 {
		limit = 20 // Google caps at 20
	}

	body := nearbyRequest{
		IncludedTypes:       categoryIDs,
		MaxResultCount:      limit,
		LocationRestriction: locationRestriction{Circle: circle{Center: latLng{Latitude: lat, Longitude: lng}, Radius: float64(radius)}},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("google: marshal request: %w", err)
	}

	if c.debug {
		log.Printf("[DEBUG] google: nearby search types=%v lat=%.5f lng=%.5f radius=%d", categoryIDs, lat, lng, radius)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, nearbySearchURL, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("google: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("X-Goog-FieldMask", "places.id,places.displayName,places.location,places.types,places.rating,places.priceLevel,places.userRatingCount")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google: unexpected status %d", resp.StatusCode)
	}

	var result nearbyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("google: decode response: %w", err)
	}

	if c.debug {
		log.Printf("[DEBUG] google: nearby search returned %d results", len(result.Places))
	}

	candidates := make([]model.Candidate, 0, len(result.Places))
	for _, p := range result.Places {
		placeLat := p.Location.Latitude
		placeLng := p.Location.Longitude
		distance := haversine(lat, lng, placeLat, placeLng)

		category := normalizeGoogleTypes(p.Types)

		if c.debug {
			log.Printf("[DEBUG] google:   %s (%s) rating=%.1f price=%s reviews=%d dist=%.0fm",
				p.DisplayName.Text, category, p.Rating, p.PriceLevel, p.UserRatingCount, distance)
		}

		candidates = append(candidates, model.Candidate{
			FsqID:         p.ID,
			Name:          p.DisplayName.Text,
			Lat:           placeLat,
			Lng:           placeLng,
			Category:      category,
			Rating:        p.Rating,
			Reviews:       p.UserRatingCount,
			Price:         priceLevelToInt(p.PriceLevel),
			Distance:      distance,
			RawCategories: p.Types,
		})
	}
	return candidates, nil
}

// MatchPlace calls Google Places Text Search (New) with location bias.
func (c *Client) MatchPlace(ctx context.Context, name string, lat, lng float64) (*model.PlaceMatch, error) {
	body := textSearchRequest{
		TextQuery: name,
		LocationBias: &locationBias{
			Circle: circle{
				Center: latLng{Latitude: lat, Longitude: lng},
				Radius: 200,
			},
		},
		MaxResultCount: 1,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("google: marshal text search: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, textSearchURL, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("google: build text search request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)
	req.Header.Set("X-Goog-FieldMask", "places.id,places.displayName,places.location,places.types")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google: http text search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google: text search unexpected status %d", resp.StatusCode)
	}

	var result nearbyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("google: decode text search: %w", err)
	}

	if len(result.Places) == 0 {
		return nil, nil
	}

	p := result.Places[0]
	return &model.PlaceMatch{
		FsqID:         p.ID,
		Name:          p.DisplayName.Text,
		Category:      normalizeGoogleTypes(p.Types),
		RawCategories: p.Types,
	}, nil
}

// ---------------------------------------------------------------------------
// Google Places API JSON structs
// ---------------------------------------------------------------------------

type nearbyRequest struct {
	IncludedTypes       []string            `json:"includedTypes"`
	MaxResultCount      int                 `json:"maxResultCount"`
	LocationRestriction locationRestriction `json:"locationRestriction"`
}

type locationRestriction struct {
	Circle circle `json:"circle"`
}

type circle struct {
	Center latLng  `json:"center"`
	Radius float64 `json:"radius"`
}

type latLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type textSearchRequest struct {
	TextQuery      string        `json:"textQuery"`
	LocationBias   *locationBias `json:"locationBias,omitempty"`
	MaxResultCount int           `json:"maxResultCount"`
}

type locationBias struct {
	Circle circle `json:"circle"`
}

type nearbyResponse struct {
	Places []googlePlace `json:"places"`
}

type googlePlace struct {
	ID              string      `json:"id"`
	DisplayName     displayName `json:"displayName"`
	Location        latLng      `json:"location"`
	Types           []string    `json:"types"`
	Rating          float64     `json:"rating"`
	PriceLevel      string      `json:"priceLevel"`
	UserRatingCount int         `json:"userRatingCount"`
}

type displayName struct {
	Text string `json:"text"`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// normalizeGoogleTypes maps Google Places types to normalized categories.
func normalizeGoogleTypes(types []string) string {
	for _, t := range types {
		switch t {
		case "cafe", "coffee_shop":
			return "cafe"
		case "restaurant", "food", "meal_delivery", "meal_takeaway", "bakery", "bar":
			return "food"
		case "park", "garden", "tourist_attraction", "church", "historical_landmark",
			"monument", "memorial", "plaza":
			return "landmark"
		case "museum", "shopping_mall", "clothing_store", "night_club", "amusement_park":
			return "activity"
		}
	}
	return "activity"
}

// priceLevelToInt maps Google's priceLevel enum string to an integer.
func priceLevelToInt(level string) int {
	switch level {
	case "PRICE_LEVEL_FREE":
		return 0
	case "PRICE_LEVEL_INEXPENSIVE":
		return 1
	case "PRICE_LEVEL_MODERATE":
		return 2
	case "PRICE_LEVEL_EXPENSIVE":
		return 3
	case "PRICE_LEVEL_VERY_EXPENSIVE":
		return 4
	default:
		return 0
	}
}

// haversine returns the distance in meters between two lat/lng points.
func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
