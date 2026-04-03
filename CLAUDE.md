# Travel Tomorrow — Project Guide

## Overview
- Travel Tomorrow is a vibe-based trip planner.
- Users describe budget, tastes, pace, and interests.
- The system generates a loose, area-based day itinerary.
- Each day can be viewed on a map with routes and places.

## Goals
- Build a real, portfolio-grade product.
- Learn backend systems + AI + infra, not just UI.
- Keep everything local-first and cheap.
- Design it so it can become a mobile app later.

## Architecture
- Frontend → Web app (Next.js)
- Backend → API service
- Services:
  - LLM (local)
  - Postgres DB
  - Redis cache
- Orchestrated with Docker / docker-compose.

## Stack
- Frontend: Next.js (App Router)
- Backend API: Go
- DB: Postgres (local Docker, Neon later)
- Cache: Redis (Docker)
- LLM: Ollama (local models)
- Places: Foursquare API (free, `PAY_API=false`) or Google Places API (paid, `PAY_API=true`)
- Geocoding / Must-visit search: Nominatim (OpenStreetMap, always, no key required)
- Maps: Google Maps (web)
- Auth: TBD (not yet implemented)

## Local-First Setup
- Everything runs locally via Docker:
  - API
  - DB
  - Redis
  - LLM
- Foursquare API key required (free tier works for dev).
- Use ENV config so services can be swapped later.

## LLM Responsibilities
- Turn user preferences into:
  - Day-by-day plans
  - Area-grouped stops
  - Food + activity suggestions
- Output structured JSON, not raw prose.

## Best Practices
- Clean service boundaries (UI → API → services)
- No direct DB or LLM access from frontend
- Use DTOs / schemas for API responses
- Cache external/LLM-heavy calls in Redis
- Keep prompts versioned and explicit
- Design for replaceability (local → cloud)

## Future Direction
- Web first, mobile later (iOS/Android)
- Backend stays the same, only UI changes
- Swap:
  - Local LLM
  - Local Postgres → Neon
  - Local Redis → Upstash

## Tone & Style
- Build for clarity over cleverness
- Favor simple, readable code
- Optimize for iteration speed, not premature scale