"use client";

import { useMemo } from "react";
import {
  MapPin,
  Utensils,
  Coffee,
  ShoppingBag,
  Trees,
  Landmark,
  Building2,
  Palette,
  Wine,
  Beer,
  Layers,
  type LucideIcon,
} from "lucide-react";
import MapWrapper from "@/components/MapWrapper";
import RemapButton from "@/components/RemapButton";
import type { DayPlan, PlaceIcon, PlaceStop } from "@/types/itinerary";
import type { DayOverlay } from "./LeafletMap";
import { DAY_COLORS } from "@/constants/itinerary";

const iconMap: Record<PlaceIcon, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  shopping: ShoppingBag,
  trees: Trees,
  landmark: Landmark,
  museum: Building2,
  palette: Palette,
  wine: Wine,
  beer: Beer,
  "map-pin": MapPin,
};

interface MapSectionProps {
  days: DayPlan[];
  selectedDayNumber: number | null;
  onSelectDay: (dayNumber: number | null) => void;
  mapStops: PlaceStop[];
  mapDirty: boolean;
  onRemap: () => void;
  city: string;
  onBack: () => void;
}

export default function MapSection({
  days,
  selectedDayNumber,
  onSelectDay,
  mapStops,
  mapDirty,
  onRemap,
  city,
  onBack,
}: MapSectionProps) {
  const isOverview = selectedDayNumber === null;

  const allDaysOverlay = useMemo<DayOverlay[]>(() => {
    if (!isOverview) return [];
    return days.map((day, i) => ({
      dayNumber: day.day_number,
      color: DAY_COLORS[i % DAY_COLORS.length],
      stops: day.stops,
    }));
  }, [days, isOverview]);

  const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-white">
        <button
          onClick={onBack}
          className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Planning
        </button>
        <p className="text-sm text-[var(--color-text-muted)]">
          {city} &middot; {isOverview ? `${days.length} days, ${totalStops} stops` : `Day ${selectedDayNumber} of ${days.length}`}
        </p>
      </div>

      {/* Sidebar + Map */}
      <div className="flex flex-1 min-h-0">
        {/* Day list sidebar */}
        <div className="w-[220px] shrink-0 border-r border-[var(--color-border)]/50 overflow-y-auto py-2 hidden sm:block">
          {/* All Days overview button */}
          <button
            onClick={() => onSelectDay(null)}
            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
              isOverview
                ? "bg-[var(--color-primary-wash)]"
                : "hover:bg-[var(--color-bg-alt)]"
            }`}
            style={isOverview ? { borderLeft: "3px solid var(--color-primary)" } : { borderLeft: "3px solid transparent" }}
          >
            <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-primary)] shrink-0">
              <Layers size={13} className="text-white" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium truncate ${isOverview ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                All Days
              </p>
              <p className="text-[10px] text-[var(--color-text-light)]">
                Overview
              </p>
            </div>
          </button>

          <div className="h-px bg-[var(--color-border)]/50 mx-3 my-1" />

          {days.map((day, i) => {
            const isActive = day.day_number === selectedDayNumber;
            const color = DAY_COLORS[i % DAY_COLORS.length];
            return (
              <div key={day.day_number}>
                <button
                  onClick={() => onSelectDay(day.day_number)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-primary-wash)]"
                      : "hover:bg-[var(--color-bg-alt)]"
                  }`}
                  style={isActive ? { borderLeft: `3px solid ${color}` } : { borderLeft: "3px solid transparent" }}
                >
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {day.day_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate ${isActive ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                      {day.neighborhood || "New Day"}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-light)]">
                      {day.stops.length} {day.stops.length === 1 ? "stop" : "stops"}
                    </p>
                  </div>
                </button>
                <div className={`grid-expand ${isActive ? "expanded" : ""}`}>
                  <div className="grid-expand-inner">
                    {day.stops.map((stop, idx) => {
                      const Icon = iconMap[stop.icon] ?? MapPin;
                      return (
                        <div
                          key={stop.fsq_id}
                          className="flex items-center gap-2 py-1 pl-12 pr-3"
                        >
                          <span className="text-[10px] text-[var(--color-text-light)] w-3 text-right shrink-0">
                            {idx + 1}
                          </span>
                          <Icon size={12} className="text-[var(--color-text-light)] shrink-0" strokeWidth={1.5} />
                          <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                            {stop.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 p-2">
            {isOverview ? (
              <MapWrapper stops={[]} allDays={allDaysOverlay} />
            ) : (
              <MapWrapper stops={mapStops} dayColor={DAY_COLORS[(selectedDayNumber - 1) % DAY_COLORS.length]} />
            )}
          </div>
          {!isOverview && mapDirty && <RemapButton onClick={onRemap} />}
        </div>
      </div>
    </div>
  );
}
