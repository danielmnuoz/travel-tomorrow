import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
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
  }));

  return NextResponse.json(results);
}
