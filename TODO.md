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

- **LLM icon selection** — LLM sometimes returns a plain English word (e.g. `"cafe"`) instead of the valid key (e.g. `"coffee"`), causing the icon to fall back to `map-pin`. (Might not do anything until access to a better LLM). If we do address this we want to do this singularly with a lot of testing.

---

# Feature Ideas

## Neighborhood Selection
- After picking a city, user picks which neighborhoods to include (e.g. NYC → Lower Manhattan, Harlem, Brooklyn, West Side, Long Island City)
- Neighborhoods are **manually curated** per supported city (name + bounding coords)
- Foursquare fetch scoped to selected neighborhoods, not just city center
- LLM prompt respects which neighborhoods were selected
- Only supported for cities where we've added neighborhood data

## Must-Visit Spots
- User can specify places they definitely want to visit
- Input: curated list suggestions + free-text search that hits Foursquare
- These get injected into the shortlist as pinned/locked candidates
- LLM prompt says "these stops MUST appear, schedule around them"
- Natural extension: "here are my 7 places, organize the trip for me" (advanced input mode)

## Curated Lists
- Maintain lists of notable places per city (Michelin picks, personal recommendations, etc.)
- Store as JSON file per city to start, migrate to Postgres later
- Surface as suggestions: "Since you're in NYC, consider these spots"
- Boost curated places in the scorer
- Feeds into must-visit spots and smart suggestions

## Export to Calendar
- Generate `.ics` file from itinerary (each stop = calendar event with time slot)
- Client-side only — build the `.ics` string in JS, trigger download
- No backend or API keys needed

## Share Plan (View-Only Link)
- **Requires Postgres** — itineraries need to be persisted with a unique ID
- Save itinerary on generation, produce a shareable URL like `/plan/:id`
- Recipient sees the itinerary read-only
- Collaborative editing noted as a future possibility, not MVP

## Rule-Based Form Suggestions
- Frontend-only nudges during form configuration
- Examples:
  - No food style selected → "We'll default to local eats"
  - Only nightlife selected → "Want to add food spots too?"
  - Budget $ + Elegant food → gentle mismatch warning
- Simple conditionals, no LLM calls during form filling

## See All Routes on Map
- Currently map shows one day's stops at a time
- Add option to show all days simultaneously, color-coded by day number
- Pass all days' stops to MapContainer, differentiate with distinct colors

## Dual API Key Support
- Config flag for which Foursquare tier to use (Embed API vs Places API)
- Allows using expensive API key for personal use, free web key for public
- Infrastructure/config concern, not user-facing — implement when needed
