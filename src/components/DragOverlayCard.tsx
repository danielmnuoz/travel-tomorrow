"use client";

import {
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

interface DragOverlayCardProps {
  stop: PlaceStop;
}

export default function DragOverlayCard({ stop }: DragOverlayCardProps) {
  const Icon = iconMap[stop.icon] ?? MapPin;

  return (
    <div
      className="w-72 rounded-lg bg-white shadow-xl border border-[var(--color-border)] p-3 opacity-95"
      style={{ transform: "scale(1.03)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-bg-alt)] shrink-0">
          <Icon
            size={13}
            className="text-[var(--color-text-muted)]"
            strokeWidth={1.5}
          />
        </div>
        <span className="text-sm font-medium text-[var(--color-text)] truncate">
          {stop.name}
        </span>
      </div>
    </div>
  );
}
