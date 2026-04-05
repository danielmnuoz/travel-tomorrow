"use client";

import dynamic from "next/dynamic";
import type { PlaceStop, DayOverlay, LatLng } from "@/types/itinerary";

const PAY_API = process.env.NEXT_PUBLIC_PAY_API === "true" || process.env.NEXT_PUBLIC_PAY_API === "1";

const MapComponent = PAY_API
  ? dynamic(() => import("./GoogleMapView"), { ssr: false })
  : dynamic(() => import("./LeafletMap"), { ssr: false });

interface MapWrapperProps {
  stops: PlaceStop[];
  dayColor?: string;
  allDays?: DayOverlay[];
  cityCenter?: LatLng;
}

export default function MapWrapper({ stops, dayColor = "#E07A5F", allDays, cityCenter }: MapWrapperProps) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--color-bg-alt)] border border-[var(--color-border)]/50 shadow-sm">
      <MapComponent stops={stops} dayColor={dayColor} allDays={allDays} cityCenter={cityCenter} />
    </div>
  );
}
