"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import TimeSlotLane from "@/components/TimeSlotLane";
import AddPlaceSearch from "@/components/AddPlaceSearch";
import type { DayPlan, PlaceStop } from "@/types/itinerary";
import { DAY_COLORS, TIME_SLOTS } from "@/constants/itinerary";

interface DayColumnProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSetActive: () => void;
  totalDays: number;
  city: string;
  onEditStop: (
    dayNumber: number,
    fsqId: string,
    updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>
  ) => void;
  onDeleteStop: (dayNumber: number, fsqId: string) => void;
  onMoveStopToDay: (fromDay: number, fsqId: string, toDay: number) => void;
  onAddStop: (dayNumber: number, stop: PlaceStop) => void;
  onDeleteDay: (dayNumber: number) => void;
  canDeleteDay: boolean;
}

export default function DayColumn({
  day,
  index,
  isActive,
  onSetActive,
  totalDays,
  city,
  onEditStop,
  onDeleteStop,
  onMoveStopToDay,
  onAddStop,
  onDeleteDay,
  canDeleteDay,
}: DayColumnProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accentColor = DAY_COLORS[index % DAY_COLORS.length];

  const stopsForSlot = (slot: string) =>
    day.stops.filter((s) => s.time_slot.toLowerCase() === slot);

  return (
    <div
      className={`group w-[400px] shrink-0 flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200 animate-slide-in-right snap-start ${
        isActive
          ? "border-[var(--color-primary)]/30 shadow-md"
          : "border-[var(--color-border)]/60 hover:border-[var(--color-border)]"
      }`}
      style={{
        borderTopWidth: 3,
        borderTopColor: accentColor,
        animationDelay: `${index * 80}ms`,
      }}
      onClick={onSetActive}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {day.day_number}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
              {day.neighborhood}
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {day.theme}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] font-medium text-[var(--color-text-light)] bg-[var(--color-bg-alt)] px-2 py-0.5 rounded-full">
            {day.stops.length} {day.stops.length === 1 ? "stop" : "stops"}
          </span>
          {canDeleteDay && (
            confirmDelete ? (
              <div className="flex items-center gap-1 animate-fade-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDay(day.day_number);
                    setConfirmDelete(false);
                  }}
                  className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  Remove
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--color-text-light)] opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all duration-200 cursor-pointer"
                title="Delete day"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 flex flex-col flex-1 min-h-0">
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 pr-1">
          {TIME_SLOTS.map((slot) => (
            <TimeSlotLane
              key={slot}
              dayNumber={day.day_number}
              timeSlot={slot}
              stops={stopsForSlot(slot)}
              totalDays={totalDays}
              onEditStop={onEditStop}
              onDeleteStop={onDeleteStop}
              onMoveStopToDay={onMoveStopToDay}
            />
          ))}
        </div>

        <AddPlaceSearch
          dayNumber={day.day_number}
          city={city}
          onAddStop={onAddStop}
        />
      </div>
    </div>
  );
}
