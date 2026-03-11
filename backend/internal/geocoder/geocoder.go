package geocoder

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
)

// Geocoder resolves an address string to lat/lng coordinates.
type Geocoder interface {
	Geocode(ctx context.Context, address string) (lat, lng float64, err error)
}

// NominatimClient uses the OpenStreetMap Nominatim API for geocoding.
type NominatimClient struct {
	httpClient *http.Client
}

// NewNominatimClient creates a new Nominatim geocoder. If httpClient is nil,
// http.DefaultClient is used.
func NewNominatimClient(httpClient *http.Client) *NominatimClient {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &NominatimClient{httpClient: httpClient}
}

type nominatimResult struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

func (c *NominatimClient) Geocode(ctx context.Context, address string) (float64, float64, error) {
	params := url.Values{}
	params.Set("q", address)
	params.Set("format", "json")
	params.Set("limit", "1")

	reqURL := "https://nominatim.openstreetmap.org/search?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return 0, 0, fmt.Errorf("nominatim: build request: %w", err)
	}
	req.Header.Set("User-Agent", "TravelTomorrow/1.0 (dev)")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("nominatim: http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, 0, fmt.Errorf("nominatim: unexpected status %d", resp.StatusCode)
	}

	var results []nominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return 0, 0, fmt.Errorf("nominatim: decode response: %w", err)
	}

	if len(results) == 0 {
		return 0, 0, fmt.Errorf("nominatim: no results for %q", address)
	}

	lat, err := strconv.ParseFloat(results[0].Lat, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("nominatim: parse lat: %w", err)
	}
	lng, err := strconv.ParseFloat(results[0].Lon, 64)
	if err != nil {
		return 0, 0, fmt.Errorf("nominatim: parse lng: %w", err)
	}

	return lat, lng, nil
}
