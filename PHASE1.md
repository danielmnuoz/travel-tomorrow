# Phase 1 — Frontend Beta Skeleton

## Goal
- Build a usable, good-looking frontend with no backend dependency.
- Focus on UX, layout, and flow.
- All data can be mocked/static for now.

---

## Design Direction
- Style: modern, clean, calm
- Palette:
  - Primary: soft green
  - Backgrounds: off-white / light gray
  - Accents: dark gray / near-black text
- Layout inspiration:
  - Airbnb-style split layout
  - Large map on the right
  - Content cards / results on the left

---

## Pages & Screens

### 1. Landing / Home
- Hero section:
  - App name: Travel Tomorrow
  - Tagline: “Plan trips by vibe, not spreadsheets.”
- CTA button: “Plan a Trip”
- Minimal nav: Logo + About + Start Planning

---

### 2. Trip Preferences Form
- Card-based form UI
- Inputs:
  - City (dropdown or text, hardcoded city list)
  - Trip length (days)
  - Budget range (slider)
  - Food style (cheap / elegant / local / street / touristy)
  - Interests (museums, nightlife, cafés, walking, shopping)
  - Pace (relaxed ↔ packed)
  - Transport preference (walk / metro / mix)
- Submit → routes to results page with mocked data

---

### 3. Itinerary Results Page (Main UX Focus)

Layout:
- Left panel: Day-by-day cards
- Right panel: Large map (takes more space than list)

Left Side:
- Day 1 / Day 2 / Day 3 sections
- Each day:
  - Area / neighborhood name
  - 3–5 stops (food + activity)
  - Short descriptions
- Click on a day → highlights route on map

Right Side:
- Full-height map
- Pins for stops
- Mock route line per day

---

### 4. Day Detail View (Optional for Phase 1)
- Expanded view when clicking a day
- Timeline layout:
  - Morning → Afternoon → Evening
- Still using mocked data

---

## Components to Build

- Navbar
- Hero section
- TripForm
- DayCard
- StopItem
- MapContainer
- LayoutShell
- Button / Input / Slider primitives

---

## Data (Mocked)

- Hardcoded itinerary JSON:
  - Days
  - Areas
  - Stops (name, lat/lng, type, description)
- No API calls yet

---

## Tech (Frontend Only)

- Next.js (App Router)
- Tailwind CSS
- Map:
  - Google Maps integration
- No auth
- No backend
- No DB

---

## UX Rules

- Mobile responsive
- Large spacing, soft shadows
- Rounded cards
- Clear hierarchy
- Map is visually dominant

---

## Out of Scope for Phase 1

- User accounts
- Saving trips
- Real AI
- Real Places API
- Caching / infra

---

## Success Criteria

- You can:
  - Land on the app
  - Fill a form
  - See a believable itinerary (dummy data if need be)
  - Click days and see routes on a big map
- It feels like a product, not a demo page

---

## Changelog

### Merged sticky header (TripSummary)
- **Problem:** City name appeared twice (once in the TripSummary bar, once in a separate city header below it). The summary bar also scrolled away, making preferences and the Edit button inaccessible while browsing the itinerary.
- **Fix:** Merged TripSummary and the city header into a single component. TripSummary now includes the day pill selector and stats line ("3 days · 15 stops"). The wrapper is `sticky top-16 z-40` so it pins below the navbar on scroll.
- **Files changed:** `src/components/TripSummary.tsx`, `src/app/plan/page.tsx`

### Back arrow to escape edit mode
- **Problem:** Clicking "Edit Preferences" reopened the form with no way to go back — you were forced to re-submit.
- **Fix:** Added an optional `onCancel` prop to `TripForm`. When editing (i.e. a plan already exists), a back arrow ("← Back") appears at the top-left above the form header, collapsing the form back to the itinerary view.
- **Files changed:** `src/components/TripForm.tsx`, `src/app/plan/page.tsx`

### Labeled preference display
- **Problem:** Preference pills like "Moderate" or "$$" lacked context — unclear what category they belonged to after submitting the form.
- **Fix:** Replaced flat pills with labeled inline pairs (e.g. "Pace **Moderate**", "Budget **$$**", "Food **Street, Local**"). Categories are separated by `/` dividers. Labels are muted, values are bold. Hidden on mobile to keep the bar compact.
- **Files changed:** `src/components/TripSummary.tsx`