# LLM Streaming

1. **Token streaming** — set `Stream: true` in the Ollama client, read newline-delimited chunks, and pipe tokens to the frontend via SSE so the itinerary builds in real-time instead of a blank wait
2. **Thinking models** — switch to a reasoning model (e.g. `deepseek-r1`, `qwen3`) which emits `<think>...</think>` blocks before the JSON; useful for dev debugging and potentially better itinerary quality

---

# Scoring Algorithm Improvements

Current state: places are scored by distance from a single city-center point, with basic category matching. No premium Foursquare fields (rating, price, popularity) are used yet.

## TODO

1. ~~**Neighborhood clustering**~~ — done: neighborhood selection scopes Foursquare to selected areas with tighter radius
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

## ~~Neighborhood Selection~~ (Implemented)

## ~~Must-Visit Spots~~ (Implemented)
- ~~User can specify places they definitely want to visit~~
- ~~Input: curated list suggestions + free-text search that hits Foursquare~~
- ~~These get injected into the shortlist as pinned/locked candidates~~
- ~~LLM prompt says "these stops MUST appear, schedule around them"~~
- ~~Natural extension: "here are my 7 places, organize the trip for me" (advanced input mode)~~

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

## Export to Calendar
- Generate `.ics` file from itinerary (each stop = calendar event with time slot)
- Client-side only — build the `.ics` string in JS, trigger download
- No backend or API keys needed

## Share Plan (View-Only Link)
- **Requires Postgres** — itineraries need to be persisted with a unique ID
- Save itinerary on generation, produce a shareable URL like `/plan/:id`
- Recipient sees the itinerary read-only
- Collaborative editing noted as a future possibility, not MVP

## See All Routes on Map
- Currently map shows one day's stops at a time
- Add option to show all days simultaneously, color-coded by day number
- Pass all days' stops to MapContainer, differentiate with distinct colors

## Dual API Key Support
- Config flag for which tier/provider to use per service:
  - **Foursquare**: Embed API vs Places API — free web key for public, expensive key for personal use
  - **Maps**: try OpenMapBox (or similar popular free option) first, upgrade to full Google Maps later
- Infrastructure/config concern, not user-facing — implement when needed

## Itinerary Results UI Revamp
- **Drag & drop** — stops can be dragged between day cards and dropped into specific time slots (morning/afternoon/evening)
- **Edit stop** — inline edit option on each stop (change name, time slot, or notes)
- **Delete stop** — remove a stop from a day without regenerating
- **Deferred map update** — map doesn't re-route on every change; instead a "Remap" button appears after edits, and clicking it recalculates routes for the updated itinerary
- Goal: let users fine-tune results post-generation without re-running the LLM
- Consider: react-beautiful-dnd or dnd-kit for drag interactions

## ~~Rule-Based Form Suggestions~~ (Implemented)
- ~~Frontend-only nudges during form configuration~~
- ~~Examples:~~
  - ~~No food style selected → "We'll default to local eats"~~
  - ~~Only nightlife selected → "Want to add food spots too?"~~
  - ~~Budget $ + Elegant food → gentle mismatch warning~~
- ~~Simple conditionals, no LLM calls during form filling~~
