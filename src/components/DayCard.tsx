"use client";

import type { Day } from "@/data/mock-itinerary";
import StopItem from "@/components/StopItem";

interface DayCardProps {
  day: Day;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

export default function DayCard({
  day,
  isSelected,
  onSelect,
  onViewDetails,
}: DayCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-5 transition-all duration-200 cursor-pointer border ${
        isSelected
          ? "bg-white border-[var(--color-primary)]/30 shadow-md shadow-[var(--color-primary)]/5"
          : "bg-white border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/20 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isSelected
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-light)]"
              }`}
            >
              {day.title}
            </span>
            {isSelected && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            )}
          </div>
          <h3 className="font-semibold text-xl text-[var(--color-text)]">
            {day.neighborhood}
          </h3>
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-4 leading-relaxed">
        {day.description}
      </p>

      {/* Stops */}
      <div className="divide-y divide-[var(--color-border)]/50">
        {day.stops.map((stop) => (
          <StopItem key={stop.id} stop={stop} />
        ))}
      </div>

      {/* View Details button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary-wash)] hover:bg-[var(--color-primary-lighter)] transition-colors duration-200 cursor-pointer"
      >
        View Details
      </button>
    </div>
  );
}
