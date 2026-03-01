import type { TripFormData } from "@/components/TripForm";
import type { ItineraryRequest, ItineraryResponse } from "@/types/itinerary";

function mapFormToRequest(data: TripFormData): ItineraryRequest {
  return {
    city: data.city.toLowerCase(),
    days: parseInt(data.days, 10),
    budget: data.budget,
    pace: data.pace,
    transport: data.transport.toLowerCase(),
    food_styles: data.foodStyles.map((s) => s.toLowerCase()),
    interests: data.interests.map((s) => s.toLowerCase()),
  };
}

export async function fetchItinerary(
  data: TripFormData
): Promise<ItineraryResponse> {
  const body = mapFormToRequest(data);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

  const res = await fetch("/api/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.error || `Request failed (${res.status})`
    );
  }

  return res.json();
}
