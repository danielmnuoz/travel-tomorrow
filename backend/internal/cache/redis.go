package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/danielmnuoz/travel-tomorrow/backend/internal/foursquare"
	"github.com/danielmnuoz/travel-tomorrow/backend/internal/model"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates a Redis client. No Ping on startup — best-effort caching.
func NewRedisClient(addr string) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: addr,
	})
}

// CachedSearcher wraps a PlaceSearcher with Redis caching.
type CachedSearcher struct {
	inner foursquare.PlaceSearcher
	rdb   *redis.Client
	ttl   time.Duration
}

// NewCachedSearcher returns a CachedSearcher that caches results in Redis.
func NewCachedSearcher(inner foursquare.PlaceSearcher, rdb *redis.Client, ttl time.Duration) *CachedSearcher {
	return &CachedSearcher{inner: inner, rdb: rdb, ttl: ttl}
}

// SearchPlaces checks Redis first, falling back to the inner searcher on miss or error.
func (c *CachedSearcher) SearchPlaces(ctx context.Context, lat, lng float64, radius int, categoryIDs []string, limit int) ([]model.Candidate, error) {
	key := cacheKey(lat, lng, categoryIDs, radius)

	// Try cache
	val, err := c.rdb.Get(ctx, key).Result()
	if err == nil {
		var candidates []model.Candidate
		if err := json.Unmarshal([]byte(val), &candidates); err == nil {
			log.Printf("[DEBUG] cache: HIT %s (%d candidates)", key, len(candidates))
			return candidates, nil
		}
		log.Printf("[DEBUG] cache: unmarshal error for key %s: %v", key, err)
	} else if err != redis.Nil {
		log.Printf("[DEBUG] cache: Redis GET error for key %s: %v", key, err)
	}

	// Cache miss or error — call inner searcher
	candidates, err := c.inner.SearchPlaces(ctx, lat, lng, radius, categoryIDs, limit)
	if err != nil {
		return nil, err
	}

	// Store in cache (best-effort)
	data, marshalErr := json.Marshal(candidates)
	if marshalErr == nil {
		if setErr := c.rdb.Set(ctx, key, data, c.ttl).Err(); setErr != nil {
			log.Printf("[DEBUG] cache: Redis SET error for key %s: %v", key, setErr)
		} else {
			log.Printf("[DEBUG] cache: MISS → stored %s (%d candidates, ttl=%s)", key, len(candidates), c.ttl)
		}
	}

	return candidates, nil
}

// cacheKey builds a deterministic cache key.
// Format: fsq:{lat},{lng}:{categoryID1,categoryID2}:{radius}
func cacheKey(lat, lng float64, categoryIDs []string, radius int) string {
	cats := ""
	for i, id := range categoryIDs {
		if i > 0 {
			cats += ","
		}
		cats += id
	}
	return fmt.Sprintf("fsq:%.4f,%.4f:%s:%d", lat, lng, cats, radius)
}
