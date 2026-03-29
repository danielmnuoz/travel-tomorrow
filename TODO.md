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
- Optional user-assigned category per pinned stop: Meal, Cafe, Activity, Landmark, Shopping, Nightlife
- Auto-detected from Nominatim class/type on search, user can click to override via inline category picker
- Helps the planner make better scheduling decisions (time-of-day, meal limits)
- Max food stops per day added to Advanced section (meals, cafes, snacks combined; optional, toggleable)

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

## Cuisine Specification
- In the advanced options, give a selection for specific type of cuisine the user likes or DOES NOT like. not sure which one would be more valuable.
- Lean towards influencing some, not all, meal selections for that cuisine. 
