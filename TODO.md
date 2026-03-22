# LLM Streaming

1. **Token streaming** — set `Stream: true` in the Ollama client, read newline-delimited chunks, and pipe tokens to the frontend via SSE so the itinerary builds in real-time instead of a blank wait
2. **Thinking models** — switch to a reasoning model (e.g. `deepseek-r1`, `qwen3`) which emits `<think>...</think>` blocks before the JSON; useful for dev debugging and potentially better itinerary quality

---

# Scoring Algorithm Improvements

## TODO

1. **Premium fields (rating, price, popularity)** — re-enable when Foursquare credits available
2. **Weather / seasonal** — boost outdoor places in good weather, indoor in bad
3. **User history / freshness** — penalize previously recommended places (requires Postgres)

---

# Known Issues

- **LLM icon selection** — LLM sometimes returns a plain English word (e.g. `"cafe"`) instead of the valid key (e.g. `"coffee"`), causing the icon to fall back to `map-pin`. (Might not do anything until access to a better LLM). If we do address this we want to do this singularly with a lot of testing.

---

# Feature Ideas

## User Category Overrides & Meal Controls
- Optional user-assigned category per pinned stop: Museum, Quick Sight (park/viewpoint), Snack/Dessert, Meal, Nightlife, Shopping
- Reduces dependency on Foursquare category resolution (which may not always match)
- Helps the planner make better scheduling decisions (time-of-day, meal limits)
- Optional min/max meals-per-day setting on the form (currently hardcoded as prompt hint of max 3)
- User override takes priority over Foursquare-resolved category

## Curated Lists
- Maintain lists of notable places per city (Michelin picks, personal recommendations, etc.)
- Store as JSON file per city to start, migrate to Postgres later
- Surface as suggestions: "Since you're in NYC, consider these spots"
- Boost curated places in the scorer
- Feeds into must-visit spots and smart suggestions

## Share Plan (View-Only Link)
- **Requires Postgres** — itineraries need to be persisted with a unique ID
- Save itinerary on generation, produce a shareable URL like `/plan/:id`
- Recipient sees the itinerary read-only
- Collaborative editing noted as a future possibility, not MVP

## See All Routes on Map
- Currently map shows one day's stops at a time
- Add option to show all days simultaneously, color-coded by day number
- Pass all days' stops to MapContainer, differentiate with distinct colors


