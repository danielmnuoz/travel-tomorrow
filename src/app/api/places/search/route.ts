import { NextRequest, NextResponse } from "next/server";
import type { PlaceCategory } from "@/types/itinerary";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  class?: string;
  type?: string;
}

function inferCategory(cls: string, type: string): PlaceCategory {
  if (cls === "amenity") {
    if (["restaurant", "fast_food", "food_court", "biergarten"].includes(type))
      return "food";
    if (["cafe", "bakery", "ice_cream", "confectionery"].includes(type))
      return "cafe";
    if (["bar", "nightclub", "pub", "lounge"].includes(type)) return "nightlife";
  }
  if (cls === "shop") return "shopping";
  if (
    cls === "tourism" &&
    ["museum", "gallery", "attraction", "artwork", "viewpoint"].includes(type)
  )
    return "landmark";
  if (cls === "historic") return "landmark";
  return "activity";
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const city = request.nextUrl.searchParams.get("city");

  if (!query || query.trim().length < 2) {
    return NextResponse.json([]);
  }

  const searchQuery = city ? `${query}, ${city}` : query;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "TravelTomorrow/1.0",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Nominatim search failed" },
      { status: 502 }
    );
  }

  const data: NominatimResult[] = await res.json();

  const results = data.map((item) => ({
    name: item.name || item.display_name.split(",")[0].trim(),
    display_name: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    category: inferCategory(item.class ?? "", item.type ?? ""),
  }));

  return NextResponse.json(results);
}
