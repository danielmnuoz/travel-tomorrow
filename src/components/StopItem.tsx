import type { Stop } from "@/data/mock-itinerary";

const typeIcons: Record<Stop["type"], { icon: string; color: string }> = {
  food: { icon: "M12 2C17.52 2 22 6.48 22 12s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z", color: "#E07A5F" },
  activity: { icon: "M12 2C17.52 2 22 6.48 22 12s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z", color: "#3D85C6" },
  cafe: { icon: "M12 2C17.52 2 22 6.48 22 12s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z", color: "#8B6914" },
  landmark: { icon: "M12 2C17.52 2 22 6.48 22 12s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z", color: "#4A7C59" },
};

const typeEmoji: Record<Stop["type"], string> = {
  food: "\u{1F374}",
  activity: "\u{1F9ED}",
  cafe: "\u{2615}",
  landmark: "\u{2B50}",
};

const timeLabels: Record<Stop["timeOfDay"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export default function StopItem({ stop }: { stop: Stop }) {
  const meta = typeIcons[stop.type];

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
        style={{ backgroundColor: meta.color + "15", color: meta.color }}
      >
        {typeEmoji[stop.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-[var(--color-text)] truncate">
            {stop.name}
          </h4>
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-light)] bg-[var(--color-bg-alt)] px-2 py-0.5 rounded-full">
            {timeLabels[stop.timeOfDay]}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
          {stop.description}
        </p>
      </div>
    </div>
  );
}
