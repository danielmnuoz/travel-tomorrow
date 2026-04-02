package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/cache"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/config"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/foursquare"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/geocoder"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/google"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/handler"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/llm"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/planner"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Initialize place provider based on PAY_API setting
	var placesClient model.PlaceSearcher
	if cfg.PayAPI {
		log.Printf("Using Google Places API (PAY_API=true)")
		placesClient = google.NewClient(cfg.GooglePlacesAPIKey, nil, cfg.Debug)
	} else {
		log.Printf("Using Foursquare API (PAY_API=false)")
		placesClient = foursquare.NewClient(cfg.FoursquareAPIKey, nil, cfg.Debug)
	}

	rdb := cache.NewRedisClient(cfg.RedisURL)
	cachedPlaces := cache.NewCachedSearcher(placesClient, rdb, 7*24*time.Hour)
	llmClient := llm.NewClient(cfg.OllamaURL, cfg.OllamaModel, nil)
	geo := geocoder.NewNominatimClient(nil)
	p := planner.New(cachedPlaces, llmClient, cfg, geo)
	h := handler.New(p)

	// Routes
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/neighborhoods", h.HandleNeighborhoods)
	mux.HandleFunc("POST /api/itinerary", h.HandleItinerary)
	mux.HandleFunc("POST /api/itinerary/stream", h.HandleItineraryStream)
	mux.HandleFunc("POST /api/itinerary/refresh-stop", h.HandleRefreshStop)

	log.Printf("server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}
