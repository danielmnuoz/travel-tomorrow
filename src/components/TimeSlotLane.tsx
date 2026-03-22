"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sunrise, Sun, Sunset } from "lucide-react";
import KanbanStopCard from "@/components/KanbanStopCard";
import type { PlaceStop } from "@/types/itinerary";

const timeConfig: Record<
  string,
  { label: string; icon: typeof Sunrise; color: string }
> = {
  morning: { label: "Morning", icon: Sunrise, color: "#E07A5F" },
  afternoon: { label: "Afternoon", icon: Sun, color: "#3D85C6" },
  evening: { label: "Evening", icon: Sunset, color: "#7B61A6" },
};

interface TimeSlotLaneProps {
  dayNumber: number;
  timeSlot: string;
  stops: PlaceStop[];
  totalDays: number;
  onEditStop: (
    dayNumber: number,
    fsqId: string,
    updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>
  ) => void;
  onDeleteStop: (dayNumber: number, fsqId: string) => void;
  onMoveStopToDay: (fromDay: number, fsqId: string, toDay: number) => void;
}

export default function TimeSlotLane({
  dayNumber,
  timeSlot,
  stops,
  totalDays,
  onEditStop,
  onDeleteStop,
  onMoveStopToDay,
}: TimeSlotLaneProps) {
  const droppableId = `lane-${dayNumber}-${timeSlot}`;
  const config = timeConfig[timeSlot];
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const sortableIds = stops.map((s) => `stop-${dayNumber}-${s.fsq_id}`);

  return (
    <div className="mb-3">
      {/* Lane label */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        {config && <config.icon size={14} strokeWidth={1.5} style={{ color: config.color }} />}
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: config?.color }}
        >
          {config?.label}
        </span>
        <span className="text-[10px] text-[var(--color-text-light)]">
          {stops.length}
        </span>
      </div>

      {/* Droppable zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[48px] rounded-lg p-2 space-y-2 transition-all duration-200 ${
          isOver
            ? "bg-[var(--color-primary-wash)] border-2 border-dashed border-[var(--color-primary)]/30"
            : "bg-[var(--color-bg-alt)]/40"
        }`}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {stops.map((stop) => (
            <KanbanStopCard
              key={stop.fsq_id}
              stop={stop}
              sortableId={`stop-${dayNumber}-${stop.fsq_id}`}
              dayNumber={dayNumber}
              totalDays={totalDays}
              onEdit={onEditStop}
              onDelete={onDeleteStop}
              onMoveToDay={onMoveStopToDay}
            />
          ))}
        </SortableContext>

        {stops.length === 0 && !isOver && (
          <p className="text-[10px] text-[var(--color-text-light)] text-center py-2 italic">
            Drop a stop here
          </p>
        )}
      </div>
    </div>
  );
}
