import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const body = await req.text();

  const res = await fetch("http://localhost:8080/api/itinerary/refresh-stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
