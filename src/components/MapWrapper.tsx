"use client";

import dynamic from "next/dynamic";
import type { PlaceStop } from "@/types/itinerary";
import type { DayOverlay } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

interface MapWrapperProps {
  stops: PlaceStop[];
  dayColor?: string;
  allDays?: DayOverlay[];
}

export default function MapWrapper({ stops, dayColor = "#E07A5F", allDays }: MapWrapperProps) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--color-bg-alt)] border border-[var(--color-border)]/50 shadow-sm">
      <LeafletMap stops={stops} dayColor={dayColor} allDays={allDays} />
    </div>
  );
}
