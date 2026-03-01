import type { PlaceStop } from "@/types/itinerary";

const categoryStyles: Record<string, { emoji: string; color: string }> = {
  food: { emoji: "\u{1F374}", color: "#E07A5F" },
  activity: { emoji: "\u{1F9ED}", color: "#3D85C6" },
  cafe: { emoji: "\u{2615}", color: "#8B6914" },
  landmark: { emoji: "\u{2B50}", color: "#4A7C59" },
  coffee: { emoji: "\u{2615}", color: "#8B6914" },
  museum: { emoji: "\u{1F3DB}", color: "#7B61A6" },
  park: { emoji: "\u{1F333}", color: "#4A7C59" },
  bar: { emoji: "\u{1F378}", color: "#C4475B" },
  shopping: { emoji: "\u{1F6CD}", color: "#D4A03C" },
};

const defaultStyle = { emoji: "\u{1F4CD}", color: "#6B7280" };

const timeLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export default function StopItem({ stop }: { stop: PlaceStop }) {
  const style = categoryStyles[stop.category.toLowerCase()] ?? defaultStyle;
  const timeLabel = timeLabels[stop.time_slot.toLowerCase()] ?? stop.time_slot;

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
        style={{ backgroundColor: style.color + "15", color: style.color }}
      >
        {style.emoji}
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
