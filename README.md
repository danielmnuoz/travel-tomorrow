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
- **LLM-powered ranking** — shortlisted Foursquare candidates are scored locally, then an LLM picks final stops and writes descriptions and themes.
- **Redis caching** — Foursquare API responses are cached (7-day TTL) to avoid redundant calls during iteration.
- **Responsive layout** — mobile stacks map above day cards; desktop uses a split view with a sticky map.
- **Form hints** — subtle inline nudges appear when form settings conflict (e.g. low budget + elegant dining) or when no food styles/interests are selected, helping users catch mismatches before generating.
- **Must-visit spots** — add specific places you want in your itinerary (e.g. "MoMA", "Joe's Pizza") via real-time search powered by Nominatim (OpenStreetMap). Type at least 3 characters and results appear after a 1-second debounce. No cap on how many spots you can add. Pinned stops are locked into the itinerary — the LLM schedules them into appropriate days and time slots, and fills the rest around them. Pinned stops cannot be swapped out. Geographically close pinned stops are automatically clustered onto the same day. Each pinned stop is matched against Foursquare at generation time to resolve its category (food, cafe, landmark, etc.), which informs scheduling and meal-limit logic. Note: Nominatim's usage policy limits requests to 1 per second and prohibits bulk/heavy usage; the debounce respects this, but self-hosting Nominatim is recommended for production traffic.
