# travel-tomorrow

## Place Search Behavior

| Scenario | Search Center | Radius |
|----------|---------------|--------|
| Hotel + Neighborhoods | Neighborhood coords | 1500m |
| Neighborhoods only | Neighborhood coords | 1500m |
| Hotel only | Hotel coords (geocoded) | Config default |
| Neither | City center | Config default |

Neighborhoods always take priority — when selected, the hotel location is ignored for place queries.
