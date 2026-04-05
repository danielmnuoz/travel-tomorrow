import type { LatLng } from "@/types/itinerary";

export const CITY_CENTERS: Record<string, LatLng> = {
  nyc:       { lat: 40.7128, lng: -74.0060 },
  paris:     { lat: 48.8566, lng: 2.3522 },
  tokyo:     { lat: 35.6762, lng: 139.6503 },
  london:    { lat: 51.5074, lng: -0.1278 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
};

export const DAY_COLORS = [
  "#E07A5F",
  "#3D85C6",
  "#7B61A6",
  "#4CAF50",
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
];

export const TIME_SLOTS = ["morning", "afternoon", "evening"];
