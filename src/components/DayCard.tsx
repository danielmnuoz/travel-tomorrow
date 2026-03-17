"use client";

import { useState } from "react";
import type { DayPlan, PlaceStop } from "@/types/itinerary";
import StopItem from "@/components/StopItem";
import type { EditValues } from "@/components/StopItem";

interface DayCardProps {
  day: DayPlan;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onEditStop?: (dayNumber: number, fsqId: string, updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>) => void;
  onDeleteStop?: (dayNumber: number, fsqId: string) => void;
  onMoveStopToDay?: (fromDay: number, fsqId: string, toDay: number) => void;
  totalDays?: number;
}

export default function DayCard({
  day,
  isSelected,
  onSelect,
  onViewDetails,
  onEditStop,
  onDeleteStop,
  onMoveStopToDay,
  totalDays,
}: DayCardProps) {
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);

  const slotOrder: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };
  const sortedStops = [...day.stops].sort(
    (a, b) => (slotOrder[a.time_slot.toLowerCase()] ?? 3) - (slotOrder[b.time_slot.toLowerCase()] ?? 3)
  );

  const handleStartEdit = (fsqId: string) => {
    const stop = day.stops.find((s) => s.fsq_id === fsqId);
    if (!stop) return;
    setEditingStopId(fsqId);
    setEditValues({
      name: stop.name,
      time_slot: stop.time_slot.toLowerCase(),
      description: stop.description,
    });
  };

  const handleEditSave = () => {
    if (!editingStopId || !editValues || !onEditStop) return;
    onEditStop(day.day_number, editingStopId, editValues);
    setEditingStopId(null);
    setEditValues(null);
  };

  const handleEditCancel = () => {
    setEditingStopId(null);
    setEditValues(null);
  };

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
              Day {day.day_number}
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
        {day.theme}
      </p>

      {/* Stops */}
      <div className="divide-y divide-[var(--color-border)]/50">
        {day.stops.length > 0 ? (
          sortedStops.map((stop) => (
            <StopItem
              key={stop.fsq_id}
              stop={stop}
              isEditing={editingStopId === stop.fsq_id}
              editValues={editingStopId === stop.fsq_id ? editValues ?? undefined : undefined}
              onEdit={onEditStop ? () => handleStartEdit(stop.fsq_id) : undefined}
              onDelete={onDeleteStop ? () => onDeleteStop(day.day_number, stop.fsq_id) : undefined}
              onEditChange={setEditValues}
              onEditSave={handleEditSave}
              onEditCancel={handleEditCancel}
              onMoveToDay={onMoveStopToDay ? (toDay: number) => onMoveStopToDay(day.day_number, stop.fsq_id, toDay) : undefined}
              dayNumber={day.day_number}
              totalDays={totalDays}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--color-text-light)] py-4 text-center">
            No stops planned
          </p>
        )}
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
