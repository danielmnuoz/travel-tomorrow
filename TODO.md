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
