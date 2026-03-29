import { NextRequest } from "next/server";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch("http://localhost:8080/api/itinerary/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the SSE stream through to the client
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
