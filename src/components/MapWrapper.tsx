"use client";

import dynamic from "next/dynamic";
import type { PlaceStop } from "@/types/itinerary";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

interface MapWrapperProps {
  stops: PlaceStop[];
  dayColor?: string;
}

export default function MapWrapper({ stops, dayColor = "#E07A5F" }: MapWrapperProps) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--color-bg-alt)] border border-[var(--color-border)]/50 shadow-sm">
      <LeafletMap stops={stops} dayColor={dayColor} />
    </div>
  );
}
