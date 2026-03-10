import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") || "";

  const res = await fetch(
    `http://localhost:8080/api/neighborhoods?city=${encodeURIComponent(city)}`,
    { method: "GET" }
  );

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
