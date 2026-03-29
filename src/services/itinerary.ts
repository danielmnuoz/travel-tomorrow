import type { TripFormData } from "@/components/TripForm";
import type {
  ItineraryRequest,
  ItineraryResponse,
  RefreshStopRequest,
  RefreshStopResponse,
} from "@/types/itinerary";

export function mapFormToRequest(data: TripFormData): ItineraryRequest {
  return {
    city: data.city.toLowerCase(),
    days: parseInt(data.days, 10),
    budget: data.budget,
    pace: data.pace,
    transport: data.transport.toLowerCase(),
    food_styles: data.foodStyles.map((s) => s.toLowerCase()),
    interests: data.interests.map((s) => s.toLowerCase()),
    address: data.address || undefined,
    neighborhoods:
      data.neighborhoods && data.neighborhoods.length > 0
        ? data.neighborhoods
        : undefined,
    must_visits:
      data.mustVisits && data.mustVisits.length > 0
        ? data.mustVisits
        : undefined,
    ...(data.maxFoodStops != null && { max_food_stops: data.maxFoodStops }),
  };
}

async function apiCall<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Request failed (${res.status})`);
  }

  return res.json();
}

const VALID_TIME_SLOTS = new Set(["morning", "afternoon", "evening"]);

function normalizeTimeSlots(res: ItineraryResponse): ItineraryResponse {
  return {
    ...res,
    days: res.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        const slot = stop.time_slot.toLowerCase();
        return {
          ...stop,
          time_slot: VALID_TIME_SLOTS.has(slot) ? slot : "afternoon",
        };
      }),
    })),
  };
}

export async function fetchItinerary(
  data: TripFormData
): Promise<ItineraryResponse> {
  const res = await apiCall<ItineraryResponse>("/api/itinerary", mapFormToRequest(data));
  return normalizeTimeSlots(res);
}

export interface StreamCallbacks {
  onStatus?: (message: string) => void;
  onThinking?: (token: string) => void;
  onToken?: (token: string) => void;
}

interface StreamEvent {
  type: "status" | "thinking" | "token" | "result" | "error";
  payload: unknown;
}

export async function fetchItineraryStream(
  data: TripFormData,
  callbacks: StreamCallbacks
): Promise<ItineraryResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

  const res = await fetch("/api/itinerary/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mapFormToRequest(data)),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Request failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let result: ItineraryResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      try {
        const event: StreamEvent = JSON.parse(jsonStr);
        switch (event.type) {
          case "status":
            callbacks.onStatus?.(event.payload as string);
            break;
          case "thinking":
            callbacks.onThinking?.(event.payload as string);
            break;
          case "token":
            callbacks.onToken?.(event.payload as string);
            break;
          case "result":
            result = event.payload as ItineraryResponse;
            break;
          case "error":
            throw new Error(event.payload as string);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== jsonStr) throw e;
      }
    }
  }

  if (!result) throw new Error("Stream ended without a result");
  return normalizeTimeSlots(result);
}

export async function refreshStop(
  req: RefreshStopRequest
): Promise<RefreshStopResponse> {
  return apiCall<RefreshStopResponse>("/api/itinerary/refresh-stop", req);
}
