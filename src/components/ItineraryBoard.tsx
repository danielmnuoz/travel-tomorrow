"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import DayColumn from "@/components/DayColumn";
import DragOverlayCard from "@/components/DragOverlayCard";
import TimeSlotLane from "@/components/TimeSlotLane";
import AddPlaceSearch from "@/components/AddPlaceSearch";
import { Plus, Trash2 } from "lucide-react";
import type { DayPlan, PlaceStop } from "@/types/itinerary";
import { DAY_COLORS, TIME_SLOTS } from "@/constants/itinerary";

interface ItineraryBoardProps {
  days: DayPlan[];
  city: string;
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEditStop: (
    dayNumber: number,
    fsqId: string,
    updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>
  ) => void;
  onDeleteStop: (dayNumber: number, fsqId: string) => void;
  onReorderStop: (
    dayNumber: number,
    timeSlot: string,
    oldIndex: number,
    newIndex: number
  ) => void;
  onMoveStopToSlot: (
    dayNumber: number,
    fsqId: string,
    newTimeSlot: string
  ) => void;
  onMoveStopToDay: (fromDay: number, fsqId: string, toDay: number) => void;
  onMoveStopToDayAndSlot: (
    fromDay: number,
    fsqId: string,
    toDay: number,
    newTimeSlot: string
  ) => void;
  onAddStop: (dayNumber: number, stop: PlaceStop) => void;
  onAddDay: () => void;
  onDeleteDay: (dayNumber: number) => void;
}

// Prefer stop-level collisions over lane-level for precise ordering
const customCollision: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  const stopCollisions = collisions.filter((c) =>
    (c.id as string).startsWith("stop-")
  );
  if (stopCollisions.length > 0) return stopCollisions;
  return collisions;
};

export default function ItineraryBoard({
  days,
  city,
  selectedDayNumber,
  onSelectDay,
  onEditStop,
  onDeleteStop,
  onReorderStop,
  onMoveStopToSlot,
  onMoveStopToDay,
  onMoveStopToDayAndSlot,
  onAddStop,
  onAddDay,
  onDeleteDay,
}: ItineraryBoardProps) {
  const [activeStopData, setActiveStopData] = useState<{
    stop: PlaceStop;
    dayNumber: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToDay = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const columnWidth = 400;
    const gap = 16;
    const padding = 16;
    const scrollTarget = padding + index * (columnWidth + gap);
    container.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const parseSortableId = (
    id: string
  ): { dayNumber: number; fsqId: string } | null => {
    const match = id.match(/^stop-(\d+)-(.+)$/);
    if (!match) return null;
    return { dayNumber: parseInt(match[1]), fsqId: match[2] };
  };

  const parseLaneId = (
    id: string
  ): { dayNumber: number; timeSlot: string } | null => {
    const match = id.match(/^lane-(\d+)-(.+)$/);
    if (!match) return null;
    return { dayNumber: parseInt(match[1]), timeSlot: match[2] };
  };

  const findStopSlot = (dayNumber: number, fsqId: string): string | null => {
    const day = days.find((d) => d.day_number === dayNumber);
    const stop = day?.stops.find((s) => s.fsq_id === fsqId);
    return stop?.time_slot.toLowerCase() ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const parsed = parseSortableId(event.active.id as string);
    if (!parsed) return;
    const day = days.find((d) => d.day_number === parsed.dayNumber);
    const stop = day?.stops.find((s) => s.fsq_id === parsed.fsqId);
    if (stop) setActiveStopData({ stop, dayNumber: parsed.dayNumber });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStopData(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeParsed = parseSortableId(activeId);
    if (!activeParsed) return;

    const { dayNumber: fromDay, fsqId: activeFsqId } = activeParsed;
    const activeSlot = findStopSlot(fromDay, activeFsqId);
    if (!activeSlot) return;

    // Dropped onto a lane (empty area)
    const overLane = parseLaneId(overId);
    if (overLane) {
      const { dayNumber: toDay, timeSlot: toSlot } = overLane;
      if (fromDay === toDay && activeSlot === toSlot) return;
      if (fromDay === toDay) {
        onMoveStopToSlot(fromDay, activeFsqId, toSlot);
      } else {
        onMoveStopToDayAndSlot(fromDay, activeFsqId, toDay, toSlot);
      }
      return;
    }

    // Dropped onto another stop
    const overParsed = parseSortableId(overId);
    if (!overParsed) return;
    const { dayNumber: toDay, fsqId: overFsqId } = overParsed;
    const overSlot = findStopSlot(toDay, overFsqId);
    if (!overSlot) return;

    if (fromDay === toDay && activeSlot === overSlot) {
      // Reorder within same day and slot
      const day = days.find((d) => d.day_number === fromDay);
      if (!day) return;
      const slotStops = day.stops.filter(
        (s) => s.time_slot.toLowerCase() === activeSlot
      );
      const oldIndex = slotStops.findIndex((s) => s.fsq_id === activeFsqId);
      const newIndex = slotStops.findIndex((s) => s.fsq_id === overFsqId);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderStop(fromDay, activeSlot, oldIndex, newIndex);
      }
    } else if (fromDay === toDay) {
      onMoveStopToSlot(fromDay, activeFsqId, overSlot);
    } else {
      onMoveStopToDayAndSlot(fromDay, activeFsqId, toDay, overSlot);
    }
  };

  const selectedDay = days.find((d) => d.day_number === selectedDayNumber);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
    >
      <div className="min-h-0 flex flex-col flex-1">
        {/* Mobile: day tabs + single column */}
        <div className="lg:hidden flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto border-b border-[var(--color-border)]/50 shrink-0">
            {days.map((day, i) => (
              <button
                key={day.day_number}
                onClick={() => onSelectDay(day.day_number)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all duration-200 cursor-pointer ${
                  selectedDayNumber === day.day_number
                    ? "text-white shadow-sm"
                    : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"
                }`}
                style={
                  selectedDayNumber === day.day_number
                    ? { backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }
                    : undefined
                }
              >
                Day {day.day_number}
              </button>
            ))}
            <button
              onClick={onAddDay}
              className="w-8 h-8 rounded-lg border-2 border-dashed border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-light)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title="Add Day"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedDay && (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text)]">
                      {selectedDay.neighborhood}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {selectedDay.theme}
                    </p>
                  </div>
                  {days.length > 1 && (
                    <button
                      onClick={() => onDeleteDay(selectedDay.day_number)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-light)] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      title="Delete day"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                {TIME_SLOTS.map((slot) => (
                  <TimeSlotLane
                    key={slot}
                    dayNumber={selectedDay.day_number}
                    timeSlot={slot}
                    stops={selectedDay.stops.filter(
                      (s) => s.time_slot.toLowerCase() === slot
                    )}
                    totalDays={days.length}
                    onEditStop={onEditStop}
                    onDeleteStop={onDeleteStop}
                    onMoveStopToDay={onMoveStopToDay}
                  />
                ))}
                <AddPlaceSearch
                  dayNumber={selectedDay.day_number}
                  city={city}
                  onAddStop={onAddStop}
                />
              </>
            )}
          </div>
        </div>

        {/* Desktop: day tabs + horizontal kanban board */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0">
          {/* Day tab pills */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1 shrink-0">
            {days.map((day, i) => (
              <button
                key={day.day_number}
                onClick={() => {
                  onSelectDay(day.day_number);
                  scrollToDay(i);
                }}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer"
                style={
                  selectedDayNumber === day.day_number
                    ? {
                        backgroundColor: DAY_COLORS[i % DAY_COLORS.length],
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "var(--color-bg-alt)",
                        color: "var(--color-text-muted)",
                      }
                }
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={
                    selectedDayNumber === day.day_number
                      ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }
                      : { backgroundColor: DAY_COLORS[i % DAY_COLORS.length] + "20", color: DAY_COLORS[i % DAY_COLORS.length] }
                  }
                >
                  {day.day_number}
                </span>
                <span className="max-w-[120px] truncate">{day.neighborhood}</span>
                <span className="text-[10px] opacity-70">{day.stops.length} stops</span>
              </button>
            ))}
            <button
              onClick={onAddDay}
              className="w-7 h-7 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center shrink-0 text-[var(--color-text-light)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)] transition-all duration-200 cursor-pointer"
              title="Add Day"
            >
              <Plus size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Kanban board */}
          <div
            ref={scrollContainerRef}
            className="flex flex-1 min-h-0 overflow-x-auto kanban-scroll scroll-smooth"
            style={{ scrollSnapType: "x proximity" }}
          >
            <div className="flex gap-4 p-4 h-full min-w-min">
              {days.map((day, i) => (
                <DayColumn
                  key={day.day_number}
                  day={day}
                  index={i}
                  isActive={selectedDayNumber === day.day_number}
                  onSetActive={() => {
                    onSelectDay(day.day_number);
                  }}
                  totalDays={days.length}
                  city={city}
                  onEditStop={onEditStop}
                  onDeleteStop={onDeleteStop}
                  onMoveStopToDay={onMoveStopToDay}
                  onAddStop={onAddStop}
                  onDeleteDay={onDeleteDay}
                  canDeleteDay={days.length > 1}
                />
              ))}

              {/* Add Day ghost column */}
              <button
                onClick={onAddDay}
                className="w-[400px] shrink-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-light)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)] transition-all duration-200 cursor-pointer snap-start"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-alt)] flex items-center justify-center">
                  <Plus size={20} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium">Add Day</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeStopData ? (
          <DragOverlayCard stop={activeStopData.stop} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
