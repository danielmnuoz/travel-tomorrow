"use client";

import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useState } from "react";
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Trees,
  Landmark,
  Building2,
  Palette,
  Wine,
  Beer,
  MapPin,
  GripVertical,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowRightLeft,
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

const timeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

function inferIcon(stop: PlaceStop): LucideIcon {
  return iconMap[stop.icon] ?? MapPin;
}

export interface EditValues {
  name: string;
  time_slot: string;
  description: string;
}

export interface StopItemProps {
  stop: PlaceStop;
  isEditing?: boolean;
  editValues?: EditValues;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditChange?: (values: EditValues) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  dragListeners?: SyntheticListenerMap;
  variant?: "card" | "detail";
  onMoveToDay?: (toDay: number) => void;
  dayNumber?: number;
  totalDays?: number;
}

export default function StopItem({
  stop,
  isEditing,
  editValues,
  onEdit,
  onDelete,
  onEditChange,
  onEditSave,
  onEditCancel,
  dragListeners,
  variant = "card",
  onMoveToDay,
  dayNumber,
  totalDays,
}: StopItemProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const Icon = inferIcon(stop);
  const timeLabel = timeLabels[stop.time_slot.toLowerCase()] ?? stop.time_slot;

  if (isEditing && editValues && onEditChange && onEditSave && onEditCancel) {
    return (
      <div
        className="py-3 space-y-2"
        onKeyDown={(e) => {
          if (e.key === "Escape") onEditCancel();
        }}
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
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Check size={12} /> Save
          </button>
          <button
            onClick={onEditCancel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg hover:bg-[var(--color-border)] transition-colors cursor-pointer"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Drag handle */}
      {dragListeners && (
        <button
          {...dragListeners}
          className="mt-1.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
        >
          <GripVertical size={14} className="text-[var(--color-text-light)]" />
        </button>
      )}

      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-[var(--color-bg-alt)]">
        <Icon size={16} className="text-[var(--color-text-muted)]" strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">
            {stop.name}
          </h4>
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-light)] bg-[var(--color-bg-alt)] px-2 py-0.5 rounded-full">
            {timeLabel}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
          {stop.description}
        </p>
      </div>

      {/* Action bar */}
      {(onEdit || onDelete) && !stop.pinned && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 relative">
          {onMoveToDay && totalDays && totalDays > 1 && dayNumber && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
                title="Move to another day"
              >
                <ArrowRightLeft size={13} className="text-[var(--color-text-light)]" />
              </button>
              {showMoveMenu && (
                <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-1 min-w-[120px] animate-fade-in">
                  {Array.from({ length: totalDays }, (_, i) => i + 1)
                    .filter((d) => d !== dayNumber)
                    .map((d) => (
                      <button
                        key={d}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToDay(d);
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
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
              title="Edit stop"
            >
              <Pencil size={13} className="text-[var(--color-text-light)]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete stop"
            >
              <Trash2 size={13} className="text-[var(--color-text-light)] hover:text-red-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
