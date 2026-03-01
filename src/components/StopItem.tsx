import type { PlaceStop } from "@/types/itinerary";

const categoryColors: Record<string, string> = {
  food: "#E07A5F",
  activity: "#3D85C6",
  cafe: "#8B6914",
  landmark: "#4A7C59",
  coffee: "#8B6914",
  museum: "#7B61A6",
  park: "#4A7C59",
  bar: "#C4475B",
  shopping: "#D4A03C",
};

const defaultColor = "#6B7280";

const timeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export default function StopItem({ stop }: { stop: PlaceStop }) {
  const color = categoryColors[stop.category.toLowerCase()] ?? defaultColor;
  const timeLabel = timeLabels[stop.time_slot.toLowerCase()] ?? stop.time_slot;

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: color + "15" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
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
