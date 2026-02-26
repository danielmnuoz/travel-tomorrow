# Getting Started — Travel Tomorrow Backend

This guide walks you through starting the entire backend system from scratch.

---

## Prerequisites

You should have installed:
- **Docker Desktop** (includes Docker and Docker Compose)
- **Go** 1.26+
- **Ollama**

To verify:
```bash
docker --version
go version
ollama --version
```

---

## Step 1: Start Ollama (One-Time Setup + Always-Run)

### First Time Only: Download the LLM Model

Ollama needs a model pulled before it can serve requests. This is a one-time download (~4.7GB):

```bash
ollama pull llama3.1:8b
```

This may take 5-15 minutes depending on your internet speed. You'll see a progress bar.

### Start the Ollama Server

Once the model is pulled, start Ollama in a terminal window:

```bash
ollama serve
```

You should see output like:
```
2026/02/19 02:50:00 "Listening on 127.0.0.1:11434 (format: ollama)"
```

**Keep this terminal open.** Ollama needs to be running for the API to work. If you close it, the API will fail with "LLM service unavailable".

---

## Step 2: Configure Environment Variables

The backend needs the Foursquare API key. Check that `.env.local` exists in the project root and has:

```bash
FOUR_SQUARE_PLACE_API_KEY=fsq3blahblah84qORg8kM
```

If it's missing or empty, add it. This file is **not committed** to git for security.

---

## Step 3: Start the Backend API

Open a **new terminal window** (keep the Ollama one open). Navigate to the project root:

```bash
cd /Users/trop/code/projects/travel-tomorrow
```

Build and start the Docker container:

```bash
docker compose up --build
```

You'll see a lot of output. Docker Compose starts two containers: **Redis** (cache) and the **API**. When it's ready, you'll see:

```
redis-1  | * Ready to accept connections tcp
api-1    | 2026/02/19 02:50:15 server listening on :8080
```

**Keep this terminal open too.** The API runs inside Docker.

---

## Step 4: Verify Everything is Running

Open a **third terminal window** (keep the other two open). Run:

```bash
curl http://localhost:8080/health
```

Expected output:
```json
{"status":"ok"}
```

If you see that, everything is working!

You can also verify Redis is running:

```bash
docker compose exec redis redis-cli ping
```

Expected output: `PONG`

---

## Step 5: Test the API

Use the payloads from `backend/TEST_PAYLOADS.md`. Example:

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

This will take **30-60 seconds** the first time (LLM inference is slow). You should get back a JSON itinerary with days and stops.

---

## Stopping Everything

### To stop the API:
In the API terminal, press `Ctrl+C`.

### To stop Ollama:
In the Ollama terminal, press `Ctrl+C`.

---

## Restarting After Stopping

If you stopped everything and want to start again:

1. **Terminal 1:** `ollama serve`
2. **Terminal 2:** `cd /Users/trop/code/projects/travel-tomorrow && docker compose up`
3. **Terminal 3:** Test with `curl http://localhost:8080/health`

---

## Troubleshooting

### "LLM service unavailable" error
- Ollama is not running. Start it with `ollama serve` in a terminal.

### "connection refused" or "Cannot connect to Docker daemon"
- Docker Desktop is not running. Open Docker Desktop.

### "FOUR_SQUARE_PLACE_API_KEY is required"
- The `.env.local` file is missing or the key is empty. Check the file exists and has the API key.

### "Foursquare: unexpected status 410"
- The API key is invalid or outdated. Check your Foursquare developer dashboard.

### API takes > 2 minutes to respond
- The LLM is still thinking. Be patient. If it times out (120s), check that Ollama is responsive:
  ```bash
  curl http://localhost:11434/api/tags
  ```

---

## File Structure Reference

```
project-root/
├── backend/                    # Go backend code
│   ├── cmd/server/main.go     # Entry point
│   ├── internal/              # All the business logic
│   │   ├── cache/             # Redis caching layer
│   │   ├── foursquare/        # Foursquare API client
│   │   ├── planner/           # Itinerary planner
│   │   └── ...
│   ├── prompts/               # LLM prompts
│   └── Dockerfile             # Container definition
├── docker-compose.yml         # Start Redis + API containers
├── .env.local                 # Environment variables (API keys)
└── TEST_PAYLOADS.md          # Example API requests
```

---

## What's Happening Under the Hood

When you run `docker compose up`:

1. Docker starts a **Redis** container for caching
2. Docker builds the Go backend from `backend/Dockerfile`
3. Docker starts the API container on port 8080
4. The API container talks to Ollama on the host machine (via `host.docker.internal:11434`)
5. When you hit the API, it:
   - Checks Redis for cached Foursquare results (saves API calls)
   - On cache miss, fetches places from Foursquare and caches them for 1 week
   - Scores them algorithmically
   - Sends shortlists to Ollama for ranking + narrative
   - Returns a structured itinerary as JSON

Redis is best-effort — if it's down, the API works normally without caching.

---

## Next Steps

Once you have everything running:
- Read `backend/TEST_PAYLOADS.md` for more test examples
- Explore the response JSON structure
- Check logs in the API terminal for debugging
