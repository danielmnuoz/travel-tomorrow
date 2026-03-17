"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { GripVertical, ArrowRightLeft } from "lucide-react";
import { refreshStop } from "@/services/itinerary";
import type { DayPlan, PlaceStop, ItineraryRequest } from "@/types/itinerary";
import type { EditValues } from "@/components/StopItem";

interface DayDetailViewProps {
  day: DayPlan;
  onClose: () => void;
  preferences: ItineraryRequest;
  onStopRefreshed: (dayNumber: number, oldFsqId: string, newStop: PlaceStop) => void;
  onEditStop: (dayNumber: number, fsqId: string, updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>) => void;
  onDeleteStop: (dayNumber: number, fsqId: string) => void;
  onReorderStop: (dayNumber: number, timeSlot: string, oldIndex: number, newIndex: number) => void;
  onMoveStopToSlot: (dayNumber: number, fsqId: string, newTimeSlot: string) => void;
  onMoveStopToDay: (fromDay: number, fsqId: string, toDay: number) => void;
  totalDays: number;
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

const TIME_SLOTS = ["morning", "afternoon", "evening"];

function SortableStopCard({
  stop,
  idx,
  config,
  refreshingStopId,
  editingStopId,
  editValues,
  onSwap,
  onEdit,
  onDelete,
  onEditChange,
  onEditSave,
  onEditCancel,
  onMoveToDay,
  dayNumber,
  totalDays,
}: {
  stop: PlaceStop;
  idx: number;
  config: { color: string; bg: string };
  refreshingStopId: string | null;
  editingStopId: string | null;
  editValues: EditValues | null;
  onSwap: (fsqId: string) => void;
  onEdit: (fsqId: string) => void;
  onDelete: (fsqId: string) => void;
  onEditChange: (values: EditValues) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onMoveToDay: (fsqId: string, toDay: number) => void;
  dayNumber: number;
  totalDays: number;
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.fsq_id, disabled: stop.pinned });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      {/* Timeline dot */}
      <div
        className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white"
        style={{ backgroundColor: config.color }}
      />
      <div
        className="rounded-xl p-4 group"
        style={{ backgroundColor: config.bg + "80" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            {!stop.pinned && (
              <button
                {...listeners}
                className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none -ml-1 mr-1"
                tabIndex={-1}
              >
                <GripVertical size={14} className="text-[var(--color-text-light)]" />
              </button>
            )}
            <span className="text-xs font-medium text-[var(--color-text-light)]">
              Stop {idx + 1}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-[var(--color-text-muted)] capitalize">
              {stop.category}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {stop.pinned ? (
              <span
                className="w-7 h-7 rounded-full bg-[var(--color-primary-lighter)] flex items-center justify-center"
                title="Pinned stop"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--color-primary)]">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
              </span>
            ) : (
              <SwapButton
                onClick={() => onSwap(stop.fsq_id)}
                isLoading={refreshingStopId === stop.fsq_id}
              />
            )}
          </div>
        </div>

        {editingStopId === stop.fsq_id && editValues ? (
          <div
            className="space-y-2 mt-2"
            onKeyDown={(e) => { if (e.key === "Escape") onEditCancel(); }}
          >
            <input
              type="text"
              value={editValues.name}
              onChange={(e) => onEditChange({ ...editValues, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") onEditSave(); }}
              className="w-full text-sm font-semibold text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary)]/50"
              autoFocus
            />
            <select
              value={editValues.time_slot}
              onChange={(e) => onEditChange({ ...editValues, time_slot: e.target.value })}
              className="text-xs font-medium text-[var(--color-text-muted)] bg-white border border-[var(--color-border)] rounded-lg px-2 py-1 outline-none focus:border-[var(--color-primary)]/50 cursor-pointer"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
            <textarea
              value={editValues.description}
              onChange={(e) => onEditChange({ ...editValues, description: e.target.value })}
              rows={2}
              className="w-full text-xs text-[var(--color-text-muted)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--color-primary)]/50 resize-none leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onEditSave}
                className="px-2.5 py-1 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={onEditCancel}
                className="px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] bg-white rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[var(--color-text)] mb-1">
                {stop.name}
              </h4>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {stop.description}
              </p>
            </div>
            {!stop.pinned && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 relative">
                {totalDays > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMoveMenu(!showMoveMenu)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer"
                      title="Move to another day"
                    >
                      <ArrowRightLeft size={12} className="text-[var(--color-text-light)]" />
                    </button>
                    {showMoveMenu && (
                      <div className="absolute right-0 top-7 z-20 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-1 min-w-[120px] animate-fade-in">
                        {Array.from({ length: totalDays }, (_, i) => i + 1)
                          .filter((d) => d !== dayNumber)
                          .map((d) => (
                            <button
                              key={d}
                              onClick={() => {
                                onMoveToDay(stop.fsq_id, d);
                                setShowMoveMenu(false);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
                            >
                              Day {d}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => onEdit(stop.fsq_id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer"
                  title="Edit stop"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-light)]">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(stop.fsq_id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                  title="Delete stop"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-light)] hover:text-red-500">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SwapButton({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isLoading}
      className="w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-[var(--color-border)] flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title="Swap this stop"
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--color-text-muted)]"
        >
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      )}
    </button>
  );
}

function TimeSection({
  timeOfDay,
  stops,
  refreshingStopId,
  editingStopId,
  editValues,
  onSwap,
  onEdit,
  onDelete,
  onEditChange,
  onEditSave,
  onEditCancel,
  onMoveToDay,
  dayNumber,
  totalDays,
}: {
  timeOfDay: string;
  stops: PlaceStop[];
  refreshingStopId: string | null;
  editingStopId: string | null;
  editValues: EditValues | null;
  onSwap: (fsqId: string) => void;
  onEdit: (fsqId: string) => void;
  onDelete: (fsqId: string) => void;
  onEditChange: (values: EditValues) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onMoveToDay?: (fsqId: string, toDay: number) => void;
  dayNumber?: number;
  totalDays?: number;
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
        <SortableContext
          items={stops.map((s) => s.fsq_id)}
          strategy={verticalListSortingStrategy}
        >
          {stops.map((stop, idx) => (
            <SortableStopCard
              key={stop.fsq_id}
              stop={stop}
              idx={idx}
              config={config}
              refreshingStopId={refreshingStopId}
              editingStopId={editingStopId}
              editValues={editValues}
              onSwap={onSwap}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditChange={onEditChange}
              onEditSave={onEditSave}
              onEditCancel={onEditCancel}
              onMoveToDay={onMoveToDay ?? (() => {})}
              dayNumber={dayNumber ?? 0}
              totalDays={totalDays ?? 0}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function DayDetailView({
  day,
  onClose,
  preferences,
  onStopRefreshed,
  onEditStop,
  onDeleteStop,
  onReorderStop,
  onMoveStopToSlot,
  onMoveStopToDay,
  totalDays,
}: DayDetailViewProps) {
  const [refreshingStopId, setRefreshingStopId] = useState<string | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const morningStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "morning");
  const afternoonStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "afternoon");
  const eveningStops = day.stops.filter((s) => s.time_slot.toLowerCase() === "evening");

  const allStops = day.stops;
  const activeStop = activeId ? allStops.find((s) => s.fsq_id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleSwap = async (fsqId: string) => {
    if (refreshingStopId) return;
    setRefreshingStopId(fsqId);

    try {
      const result = await refreshStop({
        preferences,
        current_day: day,
        stop_fsq_id: fsqId,
      });
      onStopRefreshed(day.day_number, fsqId, result.new_stop);
    } catch (err) {
      console.error("Failed to refresh stop:", err);
    } finally {
      setRefreshingStopId(null);
    }
  };

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
    if (!editingStopId || !editValues) return;
    onEditStop(day.day_number, editingStopId, editValues);
    setEditingStopId(null);
    setEditValues(null);
  };

  const handleEditCancel = () => {
    setEditingStopId(null);
    setEditValues(null);
  };

  const getStopsForSlot = (slot: string): PlaceStop[] => {
    switch (slot) {
      case "morning": return morningStops;
      case "afternoon": return afternoonStops;
      case "evening": return eveningStops;
      default: return [];
    }
  };

  const findSlotForStop = (fsqId: string): string | null => {
    for (const slot of TIME_SLOTS) {
      if (getStopsForSlot(slot).some((s) => s.fsq_id === fsqId)) return slot;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeSlot = findSlotForStop(active.id as string);
    const overSlot = findSlotForStop(over.id as string);

    if (!activeSlot || !overSlot) return;

    if (activeSlot === overSlot) {
      const slotStops = getStopsForSlot(activeSlot);
      const oldIndex = slotStops.findIndex((s) => s.fsq_id === active.id);
      const newIndex = slotStops.findIndex((s) => s.fsq_id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderStop(day.day_number, activeSlot, oldIndex, newIndex);
      }
    } else {
      onMoveStopToSlot(day.day_number, active.id as string, overSlot);
    }
  };

  const hasStops = day.stops.length > 0;

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

          {hasStops ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToParentElement]}
            >
              <TimeSection
                timeOfDay="morning"
                stops={morningStops}
                refreshingStopId={refreshingStopId}
                editingStopId={editingStopId}
                editValues={editValues}
                onSwap={handleSwap}
                onEdit={handleStartEdit}
                onDelete={(fsqId) => onDeleteStop(day.day_number, fsqId)}
                onEditChange={setEditValues}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onMoveToDay={(fsqId, toDay) => onMoveStopToDay(day.day_number, fsqId, toDay)}
                dayNumber={day.day_number}
                totalDays={totalDays}
              />
              <TimeSection
                timeOfDay="afternoon"
                stops={afternoonStops}
                refreshingStopId={refreshingStopId}
                editingStopId={editingStopId}
                editValues={editValues}
                onSwap={handleSwap}
                onEdit={handleStartEdit}
                onDelete={(fsqId) => onDeleteStop(day.day_number, fsqId)}
                onEditChange={setEditValues}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onMoveToDay={(fsqId, toDay) => onMoveStopToDay(day.day_number, fsqId, toDay)}
                dayNumber={day.day_number}
                totalDays={totalDays}
              />
              <TimeSection
                timeOfDay="evening"
                stops={eveningStops}
                refreshingStopId={refreshingStopId}
                editingStopId={editingStopId}
                editValues={editValues}
                onSwap={handleSwap}
                onEdit={handleStartEdit}
                onDelete={(fsqId) => onDeleteStop(day.day_number, fsqId)}
                onEditChange={setEditValues}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onMoveToDay={(fsqId, toDay) => onMoveStopToDay(day.day_number, fsqId, toDay)}
                dayNumber={day.day_number}
                totalDays={totalDays}
              />

              <DragOverlay>
                {activeStop ? (
                  <div className="rounded-xl p-4 bg-white shadow-xl border border-[var(--color-border)] opacity-90">
                    <h4 className="font-semibold text-sm text-[var(--color-text)] mb-1">
                      {activeStop.name}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {activeStop.description}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--color-text-light)]">
                No stops planned for this day.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
