package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/cache"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/config"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/foursquare"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/handler"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/llm"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/planner"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Initialize service clients
	fsqClient := foursquare.NewClient(cfg.FoursquareAPIKey, nil, cfg.Debug)
	rdb := cache.NewRedisClient(cfg.RedisURL)
	cachedFsq := cache.NewCachedSearcher(fsqClient, rdb, 7*24*time.Hour)
	llmClient := llm.NewClient(cfg.OllamaURL, cfg.OllamaModel, nil)
	p := planner.New(cachedFsq, llmClient, cfg)
	h := handler.New(p)

	// Routes
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /api/itinerary", h.HandleItinerary)

	log.Printf("server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}
