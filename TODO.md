# LLM Streaming

1. **Token streaming** — set `Stream: true` in the Ollama client, read newline-delimited chunks, and pipe tokens to the frontend via SSE so the itinerary builds in real-time instead of a blank wait
2. **Thinking models** — switch to a reasoning model (e.g. `deepseek-r1`, `qwen3`) which emits `<think>...</think>` blocks before the JSON; useful for dev debugging and potentially better itinerary quality

---

# Scoring Algorithm Improvements

Current state: places are scored by distance from a single city-center point, with basic category matching. No premium Foursquare fields (rating, price, popularity) are used yet.

## TODO

1. **Neighborhood clustering** — score by proximity to walkable clusters, not a single city-center point
2. **Premium fields (rating, price, popularity)** — re-enable when Foursquare credits available
3. **Time-aware scoring** — boost cafés for morning, restaurants for evening, etc.
4. **Interest affinity** — weight candidates higher when they directly match user's stated interests
5. **Distance between stops** — score based on how far apart consecutive stops would be, not just distance from center
6. **Weather / seasonal** — boost outdoor places in good weather, indoor in bad
7. **User history / freshness** — penalize previously recommended places (requires Postgres)

---

# Known Issues

- **LLM icon selection** — LLM sometimes returns a plain English word (e.g. `"cafe"`) instead of the valid key (e.g. `"coffee"`), causing the icon to fall back to `map-pin`
