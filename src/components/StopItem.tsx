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

export default function StopItem({ stop }: { stop: PlaceStop }) {
  const Icon = inferIcon(stop);
  const timeLabel = timeLabels[stop.time_slot.toLowerCase()] ?? stop.time_slot;

  return (
    <div className="flex items-start gap-3 py-3 group">
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
    </div>
  );
}
