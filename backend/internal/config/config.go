package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port               string
	FoursquareAPIKey   string
	GooglePlacesAPIKey string
	OllamaURL          string
	OllamaModel        string
	SearchRadius       int
	Debug              bool
	RedisURL           string
	PayAPI             bool
}

func Load() (*Config, error) {
	payAPI := os.Getenv("PAY_API") == "true" || os.Getenv("PAY_API") == "1"

	fsqKey := os.Getenv("FOUR_SQUARE_SERVICE_API_KEY")
	googleKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if googleKey == "" {
		googleKey = os.Getenv("MAPS_JS_API_KEY")
	}

	if payAPI {
		if googleKey == "" {
			return nil, fmt.Errorf("PAY_API=true requires GOOGLE_PLACES_API_KEY or MAPS_JS_API_KEY")
		}
	} else {
		if fsqKey == "" {
			return nil, fmt.Errorf("FOUR_SQUARE_SERVICE_API_KEY is required")
		}
	}

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	ollamaURL := os.Getenv("OLLAMA_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	ollamaModel := os.Getenv("OLLAMA_MODEL")
	if ollamaModel == "" {
		ollamaModel = "llama3.1:8b"
	}

	radius := 5000
	if r := os.Getenv("SEARCH_RADIUS_METERS"); r != "" {
		if v, err := strconv.Atoi(r); err == nil {
			radius = v
		}
	}

	debug := os.Getenv("DEBUG") == "true" || os.Getenv("DEBUG") == "1"

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	return &Config{
		Port:               port,
		FoursquareAPIKey:   fsqKey,
		GooglePlacesAPIKey: googleKey,
		OllamaURL:          ollamaURL,
		OllamaModel:        ollamaModel,
		SearchRadius:       radius,
		Debug:              debug,
		RedisURL:           redisURL,
		PayAPI:             payAPI,
	}, nil
}
