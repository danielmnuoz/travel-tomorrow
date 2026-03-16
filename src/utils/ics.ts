import type { ItineraryResponse } from "@/types/itinerary";

const TIME_SLOTS: Record<string, { start: number; end: number }> = {
  morning: { start: 9, end: 12 },
  afternoon: { start: 13, end: 17 },
  evening: { start: 18, end: 21 },
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDateTime(date: Date, hours: number, minutes: number): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}${m}${d}T${pad(hours)}${pad(minutes)}00`;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@travel-tomorrow`;
}

export function generateICS(
  itinerary: ItineraryResponse,
  startDate: Date,
  city: string,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Tomorrow//Trip Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:Trip to ${escapeText(city)}`,
  ];

  for (const day of itinerary.days) {
    const eventDate = new Date(startDate);
    eventDate.setDate(eventDate.getDate() + (day.day_number - 1));

    const slotGroups: Record<string, typeof day.stops> = {};
    for (const stop of day.stops) {
      const slot = stop.time_slot.toLowerCase();
      if (!slotGroups[slot]) slotGroups[slot] = [];
      slotGroups[slot].push(stop);
    }

    for (const [slot, stops] of Object.entries(slotGroups)) {
      const range = TIME_SLOTS[slot];
      if (!range) continue;

      const totalMinutes = (range.end - range.start) * 60;
      const perStop = Math.floor(totalMinutes / stops.length);

      stops.forEach((stop, idx) => {
        const startMinutes = range.start * 60 + idx * perStop;
        const endMinutes = startMinutes + perStop;

        const startHour = Math.floor(startMinutes / 60);
        const startMin = startMinutes % 60;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${uid()}`);
        lines.push(`DTSTART:${formatDateTime(eventDate, startHour, startMin)}`);
        lines.push(`DTEND:${formatDateTime(eventDate, endHour, endMin)}`);
        lines.push(`SUMMARY:${escapeText(stop.name)}`);
        if (stop.description) {
          lines.push(`DESCRIPTION:${escapeText(stop.description)}`);
        }
        lines.push(`LOCATION:${stop.latitude}\\,${stop.longitude}`);
        lines.push(`GEO:${stop.latitude};${stop.longitude}`);
        lines.push("END:VEVENT");
      });
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(content: string, city: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip-to-${city.toLowerCase().replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
