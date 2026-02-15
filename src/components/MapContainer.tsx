"use client";

import type { Stop } from "@/data/mock-itinerary";

interface MapContainerProps {
  stops: Stop[];
}

function buildEmbedUrl(stops: Stop[]): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (stops.length === 0) {
    return `https://www.google.com/maps/embed/v1/view?key=${key}&center=40.7128,-74.0060&zoom=12`;
  }

  if (stops.length === 1) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${stops[0].lat},${stops[0].lng}&zoom=15`;
  }

  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  let url = `https://www.google.com/maps/embed/v1/directions?key=${key}&origin=${origin}&destination=${destination}&mode=walking`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  return url;
}

export default function MapContainer({ stops }: MapContainerProps) {
  const embedUrl = buildEmbedUrl(stops);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--color-bg-alt)] border border-[var(--color-border)]/50 shadow-sm">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: "100%" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Trip Map"
      />
    </div>
  );
}
