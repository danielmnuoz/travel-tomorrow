# travel-tomorrow

## Place Search Behavior

| Scenario | Search Center | Radius |
|----------|---------------|--------|
| Hotel + Neighborhoods | Neighborhood coords | 1500m |
| Neighborhoods only | Neighborhood coords | 1500m |
| Hotel only | Hotel coords (geocoded) | Config default |
| Neither | City center | Config default |

Neighborhoods always take priority — when selected, the hotel location is ignored for place queries.

## Features

- **Vibe-based trip planning** — configure budget, pace, food style, interests, and transport mode to shape the itinerary without picking individual places.
- **Multi-day itineraries** — generates 1–7 day plans, each with a neighborhood focus, theme, and stops organized by time slot (morning, afternoon, evening).
- **Neighborhood scoping** — optionally select a desired neighborhood(s) (loaded per city) to constrain each day's stops to a tight area instead of city-wide search.
- **Hotel/Stay Address geocoding** — provide a street address to center place searches around your accommodation instead of defaulting to city center. Uses Nominatim (OpenStreetMap).
- **Interactive map** — each day's stops display as a routed path on the map. Switch between single-day view and an overview mode showing all days simultaneously, color-coded by day number.
- **Edit-in-place** — after generating an itinerary, reopen the form to tweak preferences without losing your current results.
- **Day detail modal** — expand any day card into a timeline view grouped by morning/afternoon/evening with full stop descriptions.
- **Multi-signal scoring algorithm** — candidates are scored using weighted signals before the LLM sees them. In free mode (Foursquare, 5 signals):
  - **Distance** (0.40) — closer to search origin scores higher.
  - **Category diversity** (0.15) — rarer categories get a bonus to avoid homogeneous results.
  - **Interest affinity** (0.25) — binary boost when a candidate's category matches user-selected interests (e.g. "museums" → activity candidates).
  - **Time bonus** (0.10) — categories with strong time-slot fit score higher (cafés for morning, restaurants for evening).
  - **Proximity clustering** (0.10) — post-scoring pass rewards candidates near other high-scoring candidates, forming natural walkable clusters.
  - Walk mode and packed pace shift weights toward distance and proximity for tighter geographic grouping.
  - When `PAY_API=true` (Google Places), three premium signals are auto-detected and added (8 signals total):
    - **Rating** (0.25) — Google's 1–5 star rating, normalized to 0–1. Higher-rated places score higher but aren't hard-filtered — a well-located 3.5-star spot can still beat a distant 4.5-star one through distance, interest, and clustering signals.
    - **Popularity** (0.10) — review count normalized against the batch maximum.
    - **Price match** (0.15) — how closely the place's price tier matches the user's budget (exact=1.0, off-by-1=0.6, off-by-2=0.3).
- **LLM-powered ranking** — scored and shortlisted candidates are passed to an LLM, which picks final stops and writes descriptions and themes.
- **Live token streaming** — itinerary generation streams tokens in real-time via SSE instead of showing a blank spinner. Supports thinking models (qwen3, deepseek-r1, etc.) — reasoning output streams as a visible "Thinking" section before the JSON itinerary builds. Uses Ollama's native `think: true` parameter. Works with both local and Ollama cloud models.
- **Redis caching** — place API responses are cached (7-day TTL) to avoid redundant calls during iteration.
- **Responsive layout** — mobile stacks map above day cards; desktop uses a split view with a sticky map.
- **Form hints** — subtle inline nudges appear when form settings conflict (e.g. low budget + elegant dining) or when no food styles/interests are selected, helping users catch mismatches before generating.
- **Export to calendar** — download your itinerary as an `.ics` file to import into Google Calendar, Apple Calendar, or Outlook. Pick a trip start date and each stop becomes a calendar event with the correct date, time slot, location, and description. Client-side only — no backend or API keys needed.
- **Must-visit spots** — add specific places you want in your itinerary (e.g. "MoMA", "Joe's Pizza") via real-time search powered by Nominatim (OpenStreetMap). Type at least 3 characters and results appear after a 1-second debounce. No cap on how many spots you can add. Pinned stops are locked into the itinerary — the LLM schedules them into appropriate days and time slots, and fills the rest around them. Pinned stops cannot be swapped out. Geographically close pinned stops are automatically clustered onto the same day. Each pinned stop is matched against Foursquare at generation time to resolve its category (food, cafe, landmark, etc.), which informs scheduling and meal-limit logic. Note: Nominatim's usage policy limits requests to 1 per second and prohibits bulk/heavy usage; the debounce respects this, but self-hosting Nominatim is recommended for production traffic.

## Free vs Paid (`PAY_API`)

The `PAY_API` environment variable switches both the frontend map and the backend place provider.

| | `PAY_API=false` (default) | `PAY_API=true` |
|---|---|---|
| **Place search** | Foursquare Places API | Google Places API (New) |
| **Scoring** | 5 signals (no rating/price data) | 8 signals (rating, popularity, price match) |
| **Map tiles** | Leaflet + OpenStreetMap | Google Maps JavaScript API |
| **Routing** | OSRM (public, free, no key) | Google Directions API (walking) |
| **Markers** | `react-leaflet` with `divIcon` | `@vis.gl/react-google-maps` with `AdvancedMarker` |
| **Geocoding + must-visit search** | Nominatim (OpenStreetMap, free, no key) | Nominatim (OpenStreetMap, free, no key) |
| **Cost** | Free | Google Maps + Places billing |
| **Env vars needed** | `FOUR_SQUARE_SERVICE_API_KEY` | `MAPS_JS_API_KEY`, `GOOGLE_MAP_ID`, `GOOGLE_PLACES_API_KEY` (optional, falls back to `MAPS_JS_API_KEY`) |

To enable paid mode, set these in `.env.local`:

```
PAY_API=true
MAPS_JS_API_KEY=your-google-maps-js-api-key
GOOGLE_MAP_ID=your-map-id
```

The API key needs **Maps JavaScript API**, **Directions API**, and **Places API (New)** enabled in Google Cloud Console. For local development, set the key's application restriction to "None" — HTTP referrer restrictions don't work with `localhost`. The backend reads `GOOGLE_PLACES_API_KEY` first, falling back to `MAPS_JS_API_KEY`.

## How Preferences Shape the Itinerary

Each form field influences the algorithm at different stages — some drive Foursquare queries, some adjust scoring weights, and some are guidance for the LLM's final picks.

### Pipeline Overview

```
User preferences
      ↓
Place search — Foursquare or Google Places (Interests → category IDs, Neighborhoods → search centers)
      ↓
Candidate scoring (5 signals free, 8 signals premium — adjusted by Transport + Pace)
      ↓
Shortlist (top 8 × number of interests, plus any must-visit places)
      ↓
LLM ranking (picks final stops, writes descriptions, respects Budget + Food Style + Pace)
```

### Budget

Options: `$` (1) · `$$` (2) · `$$$` (3) · `$$$$` (4)

Budget is passed to the LLM as guidance for descriptions and stop selection. When `PAY_API=true`, the scorer also uses budget for **price match scoring** — places whose price tier matches the budget score higher (exact=1.0, off-by-1=0.6, off-by-2=0.3). In free mode, budget is LLM guidance only. The frontend warns if you pair a low budget with elegant dining.

### Pace

Options: `Relaxed` (1) · `Moderate` (3) · `Packed` (5)

- **Stop count per day** — the LLM uses pace to decide how many stops: relaxed = 3, moderate = 4, packed = 5.
- **Scoring weights** — packed pace (≥ 4) shifts scorer weights to favor geographic clustering:

  **Free mode (5 signals):**
  | Signal | Default | Packed / Walk |
  |--------|---------|---------------|
  | Distance | 0.40 | **0.45** |
  | Category diversity | 0.15 | 0.10 |
  | Interest affinity | 0.25 | 0.20 |
  | Time bonus | 0.10 | 0.10 |
  | Proximity clustering | 0.10 | **0.15** |

  **Premium mode (8 signals, `PAY_API=true`):**
  | Signal | Default | Packed / Walk |
  |--------|---------|---------------|
  | Distance | 0.20 | **0.25** |
  | Category diversity | 0.05 | 0.05 |
  | Interest affinity | 0.15 | 0.10 |
  | Time bonus | 0.05 | **0.10** |
  | Proximity clustering | 0.05 | **0.10** |
  | Rating | 0.25 | 0.20 |
  | Popularity | 0.10 | 0.10 |
  | Price match | 0.15 | 0.10 |

  This keeps packed-day stops walkably close together.

### Food Style

Options: `Cheap Eats` · `Elegant` · `Local` · `Street Food` · `Touristy` (multi-select)

Food style is **LLM-level guidance only**. It does not filter or re-weight Foursquare candidates — the LLM receives the selected styles and uses them to prefer matching restaurants and write appropriate descriptions. "Food" (restaurant) candidates are always fetched from Foursquare regardless of selection. A meal limit of 3 per day is enforced in the prompt (cafes/bakeries/dessert count as snacks, not meals).

### Interests

Options: `Museums` · `Nightlife` · `Cafes` · `Shopping` · `Parks` · `History` (multi-select)

Interests are the **primary driver of what gets searched**. Each selection maps to specific Foursquare category IDs:

| Interest | Foursquare Categories |
|----------|----------------------|
| Museums | Museum |
| Nightlife | Night Club |
| Cafes | Coffee Shop, Café |
| Shopping | Shopping Mall |
| Parks | Park |
| History | Landmarks and Outdoors |

"Food" (Restaurant) is **always included** as a default category regardless of what you pick. Each interest also triggers the **interest affinity** scoring signal (weight 0.25) — candidates whose normalized category matches a selected interest get a full affinity bonus. The shortlist size scales with the number of interests (8 candidates per interest).

### Transport Mode

Options: `Walk` · `Metro` · `Mix`

- **Walk** shifts scoring weights identically to packed pace (see table above), prioritizing distance and proximity clustering so stops are within walking range of each other.
- **Metro** and **Mix** both use default scoring weights. The map renders route directions using the selected mode.

### Neighborhoods

Optional multi-select, loaded per city.

When neighborhoods are selected, the search strategy changes entirely: instead of one city-wide Foursquare search, the planner fetches candidates from each neighborhood center with a tighter 1500m radius. Neighborhoods are then assigned to days using a greedy clustering algorithm, and the LLM receives these assignments as constraints.

### Must-Visit Places

Optional, no cap on count.

Pinned places are guaranteed in the itinerary with a maximum score (1000), so they always make the shortlist. Geographically close pins are clustered onto the same day. Each pin is matched against Foursquare to resolve its category, which informs scheduling and the meal limit. Pinned stops cannot be refreshed/swapped.

Users can manually override a pinned stop's category (Meal, Cafe, Activity, Landmark, Shopping, Nightlife) via an inline picker on the stop chip. The category is auto-detected from Nominatim on search, then verified against Foursquare during planning — but if the user has set an override, their choice is preserved. This matters because Foursquare category IDs don't always map cleanly to our normalized categories. The selected category feeds into time-slot affinity scoring and the per-day meal limit.

A **max food stops per day** control is available in Advanced Options (1-4, optional). When set, the LLM enforces it as a cap on combined food and cafe stops per day. If unset, defaults to 3.

### Summary

| Field | Drives Foursquare Search | Adjusts Scorer Weights | Guides LLM |
|-------|--------------------------|------------------------|-------------|
| Budget | — | Yes (price match, premium only) | Yes (descriptions + selection) |
| Pace | — | Yes (packed ≥ 4) | Yes (stops per day) |
| Food Style | — | — | Yes (restaurant preference) |
| Interests | Yes (category IDs) | Yes (affinity signal) | Indirectly |
| Transport | — | Yes (walk mode) | Map directions |
| Neighborhoods | Yes (search centers + radius) | — | Yes (day assignments) |
| Must-Visits | Yes (category matching) | Yes (score = 1000) | Yes (pinned flag) |
