---

# Scoring Algorithm Improvements

## TODO

1. **Weather / seasonal** — boost outdoor places in good weather, indoor in bad
2. **User history / freshness** — penalize previously recommended places (requires Postgres)


# Feature Ideas

## Curated Lists
- Maintain lists of notable places per city (Michelin picks, personal recommendations, etc.)
- Store as JSON file per city to start, migrate to Postgres later
- Surface as suggestions: "Since you're in NYC, consider these spots"
- Boost curated places in the scorer
- Feeds into must-visit spots and smart suggestions

