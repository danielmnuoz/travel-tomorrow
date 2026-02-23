# Test Payloads — Phase 2 API

## Quick Start (First Time Only)

### 1. Download the LLM Model
```bash
ollama pull llama3.1:8b
```
This is a one-time download (~4.7GB, takes 5-15 minutes).

### 2. Start Ollama (Keep Running)
Open a terminal and run:
```bash
ollama serve
```
Leave this terminal open. You'll see: `Listening on 127.0.0.1:11434`

### 3. Start the API (In a New Terminal)
```bash
cd /Users/trop/code/projects/travel-tomorrow
docker compose up --build
```
Leave this running too. When ready: `server listening on :8080`

### 4. Test in a Third Terminal
```bash
curl http://localhost:8080/health
```
Should return: `{"status":"ok"}`

---

## Prerequisites for Testing

1. Ollama running: `ollama serve` (in terminal 1)
2. API running: `docker compose up --build` (in terminal 2, from project root)
3. Verify: `curl http://localhost:8080/health` (in terminal 3)

---

## Health Check

```bash
curl -s http://localhost:8080/health | python3 -m json.tool
```

Expected: `{"status": "ok"}`

---

## POST /api/itinerary

### Basic NYC — 2 days, moderate

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 2,
    "budget": 2,
    "pace": 3,
    "transport": "mix",
    "food_styles": ["local", "street_food"],
    "interests": ["museums", "cafes", "walking"]
  }' | python3 -m json.tool
```

### Budget traveler — 1 day, relaxed, walking only

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 1,
    "budget": 1,
    "pace": 1,
    "transport": "walk",
    "food_styles": ["local"],
    "interests": ["parks", "walking", "cafes"]
  }' | python3 -m json.tool
```

### Big spender — 3 days, packed schedule

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 3,
    "budget": 4,
    "pace": 5,
    "transport": "metro",
    "food_styles": ["elegant"],
    "interests": ["museums", "shopping", "nightlife", "landmarks"]
  }' | python3 -m json.tool
```

### Culture & history — 2 days, easygoing

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 2,
    "budget": 2,
    "pace": 2,
    "transport": "mix",
    "food_styles": ["local", "street_food"],
    "interests": ["museums", "history", "cafes"]
  }' | python3 -m json.tool
```

### Max trip — 7 days, everything

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 7,
    "budget": 3,
    "pace": 3,
    "transport": "mix",
    "food_styles": ["local", "street_food", "elegant"],
    "interests": ["museums", "cafes", "walking", "shopping", "nightlife", "parks", "landmarks"]
  }' | python3 -m json.tool
```

---

## Error Cases

### Missing city

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "days": 2,
    "budget": 2,
    "pace": 3,
    "transport": "mix",
    "food_styles": ["local"],
    "interests": ["cafes"]
  }' | python3 -m json.tool
```

Expected: `400` — `"city is required"`

### Unknown city

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "mars",
    "days": 2,
    "budget": 2,
    "pace": 3,
    "transport": "walk",
    "food_styles": ["local"],
    "interests": ["cafes"]
  }' | python3 -m json.tool
```

Expected: `400` — `"unknown city: mars"`

### Days out of range

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "city": "nyc",
    "days": 10,
    "budget": 2,
    "pace": 3,
    "transport": "mix",
    "food_styles": ["local"],
    "interests": ["cafes"]
  }' | python3 -m json.tool
```

Expected: `400` — `"days must be between 1 and 7"`

### Invalid JSON

```bash
curl -s -X POST http://localhost:8080/api/itinerary \
  -H "Content-Type: application/json" \
  -d 'not json' | python3 -m json.tool
```

Expected: `400` — `"invalid request body: ..."`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "LLM service unavailable" | Ollama not running. Run `ollama serve` in a terminal. |
| "connection refused" on health check | Docker not running. Start Docker Desktop. |
| API takes > 2 minutes | LLM inference is slow. First request especially takes 30-60s. Be patient. |
| "Foursquare: unexpected status 410" | API key invalid/expired. Check `.env.local` for `FOUR_SQUARE_PLACE_API_KEY`. |
| "no API credits remaining" | Foursquare account out of credits. Check [billing page](https://foursquare.com/developers/orgs). |

---

## Stopping Everything

Press `Ctrl+C` in each terminal to stop:
- Terminal 1 (Ollama): `Ctrl+C`
- Terminal 2 (API): `Ctrl+C`

To restart: repeat the "Quick Start" steps.
