"use client";

import type { DayPlan, PlaceStop } from "@/types/itinerary";

interface DayDetailViewProps {
  day: DayPlan;
  onClose: () => void;
}

const timeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  morning: {
    label: "Morning",
    icon: "\u{1F305}",
    color: "#E07A5F",
    bg: "#FEF3F0",
  },
  afternoon: {
    label: "Afternoon",
    icon: "\u{2600}\u{FE0F}",
    color: "#3D85C6",
    bg: "#EFF5FB",
  },
  evening: {
    label: "Evening",
    icon: "\u{1F307}",
    color: "#7B61A6",
    bg: "#F4F0FA",
  },
};

function TimeSection({
  timeOfDay,
  stops,
}: {
  timeOfDay: string;
  stops: PlaceStop[];
}) {
  const config = timeConfig[timeOfDay];
  if (!config || stops.length === 0) return null;

  return (
    <div className="relative">
      {/* Time label */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: config.bg }}
        >
          {config.icon}
        </div>
        <h3 className="text-base font-semibold" style={{ color: config.color }}>
          {config.label}
        </h3>
      </div>

      {/* Stops */}
      <div className="ml-5 pl-5 border-l-2 border-[var(--color-border)] space-y-4 pb-6">
        {stops.map((stop, idx) => (
          <div key={stop.fsq_id} className="relative">
            {/* Timeline dot */}
            <div
              className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: config.color }}
            />
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: config.bg + "80" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--color-text-light)]">
                  Stop {idx + 1}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-[var(--color-text-muted)] capitalize">
                  {stop.category}
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[var(--color-text)] mb-1">
                {stop.name}
              </h4>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {stop.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DayDetailView({ day, onClose }: DayDetailViewProps) {
  const morningStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "morning");
  const afternoonStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "afternoon");
  const eveningStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "evening");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[var(--color-border)]/50 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              Day {day.day_number}
            </span>
            <h2 className="font-bold text-2xl text-[var(--color-text)]">
              {day.neighborhood}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] flex items-center justify-center transition-colors duration-200 cursor-pointer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Timeline content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">
            {day.theme}
          </p>
          <TimeSection timeOfDay="morning" stops={morningStops} />
          <TimeSection timeOfDay="afternoon" stops={afternoonStops} />
          <TimeSection timeOfDay="evening" stops={eveningStops} />
        </div>
      </div>
    </div>
  );
}
