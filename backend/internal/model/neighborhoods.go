package model

// Neighborhood represents a curated neighborhood within a city.
type Neighborhood struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

// Neighborhoods maps city slugs to their curated neighborhood lists.
var Neighborhoods = map[string][]Neighborhood{
	"nyc": {
		{ID: "soho", Name: "SoHo", Lat: 40.7233, Lng: -73.9985},
		{ID: "greenwich-village", Name: "Greenwich Village", Lat: 40.7336, Lng: -74.0027},
		{ID: "east-village", Name: "East Village", Lat: 40.7265, Lng: -73.9815},
		{ID: "les", Name: "Lower East Side", Lat: 40.7153, Lng: -73.9847},
		{ID: "chelsea", Name: "Chelsea", Lat: 40.7465, Lng: -74.0014},
		{ID: "williamsburg", Name: "Williamsburg", Lat: 40.7081, Lng: -73.9571},
		{ID: "upper-west-side", Name: "Upper West Side", Lat: 40.7870, Lng: -73.9754},
		{ID: "harlem", Name: "Harlem", Lat: 40.8116, Lng: -73.9465},
		{ID: "dumbo", Name: "DUMBO", Lat: 40.7033, Lng: -73.9903},
		{ID: "midtown", Name: "Midtown", Lat: 40.7549, Lng: -73.9840},
		{ID: "chinatown", Name: "Chinatown", Lat: 40.7158, Lng: -73.9970},
		{ID: "tribeca", Name: "Tribeca", Lat: 40.7163, Lng: -74.0086},
		{ID: "bushwick", Name: "Bushwick", Lat: 40.6944, Lng: -73.9213},
		{ID: "west-village", Name: "West Village", Lat: 40.7358, Lng: -74.0036},
	},
}
