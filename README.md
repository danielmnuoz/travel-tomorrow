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
- **Neighborhood scoping** — optionally select specific neighborhoods (loaded per city) to constrain each day's stops to a tight area instead of city-wide search.
- **Address geocoding** — provide a street address to center place searches around your accommodation instead of defaulting to city center. Uses Nominatim (OpenStreetMap).
- **Stop refresh** — swap out any individual stop for a new recommendation without regenerating the entire itinerary. Respects the same preferences, time slot, and category.
- **Interactive map** — each day's stops display as a routed path on Google Maps with walking/transit directions based on your transport preference.
- **Edit-in-place** — after generating an itinerary, reopen the form to tweak preferences without losing your current results.
- **Day detail modal** — expand any day card into a timeline view grouped by morning/afternoon/evening with full stop descriptions.
- **Multi-signal scoring algorithm** — candidates are scored using five weighted signals before the LLM sees them:
  - **Distance** (0.40) — closer to search origin scores higher.
  - **Category diversity** (0.15) — rarer categories get a bonus to avoid homogeneous results.
  - **Interest affinity** (0.25) — binary boost when a candidate's category matches user-selected interests (e.g. "museums" → activity candidates).
  - **Time bonus** (0.10) — categories with strong time-slot fit score higher (cafés for morning, restaurants for evening).
  - **Proximity clustering** (0.10) — post-scoring pass rewards candidates near other high-scoring candidates, forming natural walkable clusters.
  - Walk mode and packed pace shift weights toward distance and proximity for tighter geographic grouping.
- **LLM-powered ranking** — scored and shortlisted Foursquare candidates are passed to an LLM, which picks final stops and writes descriptions and themes.
- **Live token streaming** — itinerary generation streams tokens in real-time via SSE instead of showing a blank spinner. Supports thinking models (qwen3, deepseek-r1, etc.) — reasoning output streams as a visible "Thinking" section before the JSON itinerary builds. Uses Ollama's native `think: true` parameter. Works with both local and Ollama cloud models.
- **Redis caching** — Foursquare API responses are cached (7-day TTL) to avoid redundant calls during iteration.
- **Responsive layout** — mobile stacks map above day cards; desktop uses a split view with a sticky map.
- **Form hints** — subtle inline nudges appear when form settings conflict (e.g. low budget + elegant dining) or when no food styles/interests are selected, helping users catch mismatches before generating.
- **Export to calendar** — download your itinerary as an `.ics` file to import into Google Calendar, Apple Calendar, or Outlook. Pick a trip start date and each stop becomes a calendar event with the correct date, time slot, location, and description. Client-side only — no backend or API keys needed.
- **Must-visit spots** — add specific places you want in your itinerary (e.g. "MoMA", "Joe's Pizza") via real-time search powered by Nominatim (OpenStreetMap). Type at least 3 characters and results appear after a 1-second debounce. No cap on how many spots you can add. Pinned stops are locked into the itinerary — the LLM schedules them into appropriate days and time slots, and fills the rest around them. Pinned stops cannot be swapped out. Geographically close pinned stops are automatically clustered onto the same day. Each pinned stop is matched against Foursquare at generation time to resolve its category (food, cafe, landmark, etc.), which informs scheduling and meal-limit logic. Note: Nominatim's usage policy limits requests to 1 per second and prohibits bulk/heavy usage; the debounce respects this, but self-hosting Nominatim is recommended for production traffic.

## How Preferences Shape the Itinerary

Each form field influences the algorithm at different stages — some drive Foursquare queries, some adjust scoring weights, and some are guidance for the LLM's final picks.

### Pipeline Overview

```
User preferences
      ↓
Foursquare search (Interests → category IDs, Neighborhoods → search centers)
      ↓
Candidate scoring (5 weighted signals, adjusted by Transport + Pace)
      ↓
Shortlist (top 8 × number of interests, plus any must-visit places)
      ↓
LLM ranking (picks final stops, writes descriptions, respects Budget + Food Style + Pace)
```

### Budget

Options: `$` (1) · `$$` (2) · `$$$` (3) · `$$$$` (4)

Budget is passed to the LLM as guidance for descriptions and stop selection. It does **not** currently filter Foursquare results by price tier — price-level filtering is planned for when Foursquare premium fields become available. The frontend warns if you pair a low budget with elegant dining.

### Pace

Options: `Relaxed` (1) · `Moderate` (3) · `Packed` (5)

- **Stop count per day** — the LLM uses pace to decide how many stops: relaxed = 3, moderate = 4, packed = 5.
- **Scoring weights** — packed pace (≥ 4) shifts scorer weights to favor geographic clustering:

  | Signal | Default | Packed / Walk |
  |--------|---------|---------------|
  | Distance | 0.40 | **0.45** |
  | Category diversity | 0.15 | 0.10 |
  | Interest affinity | 0.25 | 0.20 |
  | Time bonus | 0.10 | 0.10 |
  | Proximity clustering | 0.10 | **0.15** |

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

### Summary

| Field | Drives Foursquare Search | Adjusts Scorer Weights | Guides LLM |
|-------|--------------------------|------------------------|-------------|
| Budget | — | — | Yes (descriptions + selection) |
| Pace | — | Yes (packed ≥ 4) | Yes (stops per day) |
| Food Style | — | — | Yes (restaurant preference) |
| Interests | Yes (category IDs) | Yes (affinity signal) | Indirectly |
| Transport | — | Yes (walk mode) | Map directions |
| Neighborhoods | Yes (search centers + radius) | — | Yes (day assignments) |
| Must-Visits | Yes (category matching) | Yes (score = 1000) | Yes (pinned flag) |
