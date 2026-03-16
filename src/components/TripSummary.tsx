"use client";

import { useState } from "react";
import type { TripFormData } from "@/components/TripForm";
import type { ItineraryResponse } from "@/types/itinerary";
import ExportModal from "@/components/ExportModal";

const budgetLabels: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

const paceLabels: Record<number, string> = {
  1: "Relaxed",
  2: "Easygoing",
  3: "Moderate",
  4: "Active",
  5: "Packed",
};

interface DayInfo {
  day_number: number;
}

interface TripSummaryProps {
  data: TripFormData;
  onEdit: () => void;
  days: DayInfo[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  totalStops: number;
  itinerary: ItineraryResponse | null;
}

export default function TripSummary({
  data,
  onEdit,
  days,
  selectedDayNumber,
  onSelectDay,
  totalStops,
  itinerary,
}: TripSummaryProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const prefs: { label: string; values: string[] }[] = [
    { label: "Budget", values: [budgetLabels[data.budget]] },
    { label: "Pace", values: [paceLabels[data.pace]] },
    { label: "Transport", values: [data.transport] },
    ...(data.foodStyles.length > 0
      ? [{ label: "Food", values: data.foodStyles }]
      : []),
    ...(data.interests.length > 0
      ? [{ label: "Into", values: data.interests }]
      : []),
  ];

  return (
    <div className="bg-white border-b border-[var(--color-border)] shadow-sm px-6 py-4 space-y-3">
      <div className="max-w-7xl mx-auto">
        {/* Row 1: City name, labeled preferences, edit button */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="font-bold text-xl sm:text-2xl text-[var(--color-text)] mr-1">
            {data.cityLabel}
          </h1>

          <div className="hidden sm:block w-px h-6 bg-[var(--color-border)]" />

          <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {prefs.map((pref, i) => (
              <span key={pref.label} className="flex items-center gap-x-3">
                {i > 0 && (
                  <span className="text-[var(--color-border)] select-none">
                    /
                  </span>
                )}
                <span>
                  <span className="text-[var(--color-text-muted)]">
                    {pref.label}
                  </span>{" "}
                  <span className="font-medium text-[var(--color-text)]">
                    {pref.values.join(", ")}
                  </span>
                </span>
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowExportModal(true)}
              className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Export Calendar
            </button>
            <button
              onClick={onEdit}
              className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit Preferences
            </button>
          </div>
        </div>

        {/* Row 2: Stats + day pills */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            {days.length} days &middot; {totalStops} stops
          </p>

          <div className="hidden sm:flex items-center gap-1 bg-[var(--color-bg-alt)] p-1 rounded-xl">
            {days.map((day) => (
              <button
                key={day.day_number}
                onClick={() => onSelectDay(day.day_number)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  selectedDayNumber === day.day_number
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                Day {day.day_number}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showExportModal && itinerary && (
        <ExportModal
          itinerary={itinerary}
          city={data.cityLabel}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
