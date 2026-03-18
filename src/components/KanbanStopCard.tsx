"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Check,
  X,
  MapPin,
  Utensils,
  Coffee,
  ShoppingBag,
  Trees,
  Landmark,
  Building2,
  Palette,
  Wine,
  Beer,
  type LucideIcon,
} from "lucide-react";
import type { PlaceIcon, PlaceStop } from "@/types/itinerary";

const iconMap: Record<PlaceIcon, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  shopping: ShoppingBag,
  trees: Trees,
  landmark: Landmark,
  museum: Building2,
  palette: Palette,
  wine: Wine,
  beer: Beer,
  "map-pin": MapPin,
};

interface KanbanStopCardProps {
  stop: PlaceStop;
  sortableId: string;
  dayNumber: number;
  totalDays: number;
  onEdit: (
    dayNumber: number,
    fsqId: string,
    updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>
  ) => void;
  onDelete: (dayNumber: number, fsqId: string) => void;
  onMoveToDay: (fromDay: number, fsqId: string, toDay: number) => void;
}

export default function KanbanStopCard({
  stop,
  sortableId,
  dayNumber,
  totalDays,
  onEdit,
  onDelete,
  onMoveToDay,
}: KanbanStopCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: "",
    time_slot: "",
    description: "",
  });
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled: stop.pinned,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const Icon = iconMap[stop.icon] ?? MapPin;

  const startEdit = () => {
    setIsEditing(true);
    setEditValues({
      name: stop.name,
      time_slot: stop.time_slot.toLowerCase(),
      description: stop.description,
    });
  };

  const saveEdit = () => {
    onEdit(dayNumber, stop.fsq_id, editValues);
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="rounded-lg bg-white border border-[var(--color-border)] p-3 space-y-2"
        onKeyDown={(e) => {
          if (e.key === "Escape") cancelEdit();
        }}
      >
        <input
          type="text"
          value={editValues.name}
          onChange={(e) =>
            setEditValues({ ...editValues, name: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
          }}
          className="w-full text-sm font-semibold text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--color-primary)]/50"
          autoFocus
        />
        <select
          value={editValues.time_slot}
          onChange={(e) =>
            setEditValues({ ...editValues, time_slot: e.target.value })
          }
          className="text-xs font-medium text-[var(--color-text-muted)] bg-white border border-[var(--color-border)] rounded-lg px-2 py-1 outline-none cursor-pointer"
        >
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
        <textarea
          value={editValues.description}
          onChange={(e) =>
            setEditValues({ ...editValues, description: e.target.value })
          }
          rows={2}
          className="w-full text-xs text-[var(--color-text-muted)] bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none resize-none leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={saveEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Check size={11} /> Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg hover:bg-[var(--color-border)] transition-colors cursor-pointer"
          >
            <X size={11} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="rounded-lg bg-white border border-[var(--color-border)]/60 p-2.5 group hover:shadow-sm hover:border-[var(--color-border)] transition-all duration-150"
    >
      <div className="flex gap-2">
        {/* Drag handle or pinned indicator */}
        <div className="shrink-0 pt-0.5">
          {!stop.pinned ? (
            <button
              {...listeners}
              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
              tabIndex={-1}
            >
              <GripVertical
                size={13}
                className="text-[var(--color-text-light)]"
              />
            </button>
          ) : (
            <span
              className="w-4 h-4 rounded-full bg-[var(--color-primary-lighter)] flex items-center justify-center"
              title="Pinned"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-[var(--color-primary)]"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
              </svg>
            </span>
          )}
        </div>

        {/* Icon */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-bg-alt)]">
          <Icon
            size={13}
            className="text-[var(--color-text-muted)]"
            strokeWidth={1.5}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">
            {stop.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-[var(--color-text-light)] bg-[var(--color-bg-alt)] px-1.5 py-0.5 rounded-full">
              {stop.category}
            </span>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed truncate">
              {stop.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!stop.pinned && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 relative">
            {totalDays > 1 && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveMenu(!showMoveMenu);
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
                  title="Move to day"
                >
                  <ArrowRightLeft
                    size={11}
                    className="text-[var(--color-text-light)]"
                  />
                </button>
                {showMoveMenu && (
                  <div className="absolute right-0 top-7 z-30 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-1 min-w-[100px] animate-fade-in">
                    {Array.from({ length: totalDays }, (_, i) => i + 1)
                      .filter((d) => d !== dayNumber)
                      .map((d) => (
                        <button
                          key={d}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveToDay(dayNumber, stop.fsq_id, d);
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
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
              title="Edit"
            >
              <Pencil
                size={11}
                className="text-[var(--color-text-light)]"
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(dayNumber, stop.fsq_id);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2
                size={11}
                className="text-[var(--color-text-light)] hover:text-red-500"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
