"use client";

import MapContainer from "@/components/MapContainer";
import RemapButton from "@/components/RemapButton";
import type { DayPlan, PlaceStop } from "@/types/itinerary";

const DAY_COLORS = [
  "#E07A5F",
  "#3D85C6",
  "#7B61A6",
  "#4CAF50",
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
];

interface MapSectionProps {
  days: DayPlan[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
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
          {city} &middot; Day {selectedDayNumber} of {days.length}
        </p>
      </div>

      {/* Sidebar + Map */}
      <div className="flex flex-1 min-h-0">
        {/* Day list sidebar */}
        <div className="w-[220px] shrink-0 border-r border-[var(--color-border)]/50 overflow-y-auto py-2 hidden sm:block">
          {days.map((day, i) => {
            const isActive = day.day_number === selectedDayNumber;
            const color = DAY_COLORS[i % DAY_COLORS.length];
            return (
              <button
                key={day.day_number}
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
            );
          })}
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 p-2">
            <MapContainer stops={mapStops} />
          </div>
          {mapDirty && <RemapButton onClick={onRemap} />}
        </div>
      </div>
    </div>
  );
}
