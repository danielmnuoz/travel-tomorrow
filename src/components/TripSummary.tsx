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

interface TripSummaryProps {
  data: TripFormData;
  onEdit: () => void;
  onViewMap?: () => void;
  totalStops: number;
  totalDays: number;
  itinerary: ItineraryResponse | null;
}

export default function TripSummary({
  data,
  onEdit,
  onViewMap,
  totalStops,
  totalDays,
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
    <>
      {/* City + stats */}
      <h1 className="font-semibold text-sm sm:text-base text-[var(--color-text)] truncate shrink-0">
        {data.cityLabel}
      </h1>

      <span className="hidden sm:block text-xs text-[var(--color-text-muted)] shrink-0">
        {totalDays}d &middot; {totalStops} stops
      </span>

      {/* Preferences — desktop only */}
      <div className="hidden lg:flex items-center gap-2 text-[11px] min-w-0 overflow-hidden">
        {prefs.map((pref, i) => (
          <span key={pref.label} className="flex items-center gap-2 shrink-0">
            {i > 0 && (
              <span className="text-[var(--color-border)] select-none">/</span>
            )}
            <span>
              <span className="text-[var(--color-text-light)]">
                {pref.label}
              </span>{" "}
              <span className="font-medium text-[var(--color-text)]">
                {pref.values.join(", ")}
              </span>
            </span>
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setShowExportModal(true)}
          className="text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)] px-2.5 py-1.5 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
        >
          <svg
            width="13"
            height="13"
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
          <span className="hidden sm:inline">Export</span>
        </button>
        {onViewMap && (
          <button
            onClick={onViewMap}
            className="text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)] px-2.5 py-1.5 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span className="hidden sm:inline">Map</span>
          </button>
        )}
        <button
          onClick={onEdit}
          className="text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)] px-2.5 py-1.5 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
        >
          <svg
            width="13"
            height="13"
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
          <span className="hidden sm:inline">Edit</span>
        </button>
      </div>

      {showExportModal && itinerary && (
        <ExportModal
          itinerary={itinerary}
          city={data.cityLabel}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}
