"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { generateICS, downloadICS } from "@/utils/ics";
import type { ItineraryResponse } from "@/types/itinerary";

interface ExportModalProps {
  itinerary: ItineraryResponse;
  city: string;
  onClose: () => void;
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function ExportModal({ itinerary, city, onClose }: ExportModalProps) {
  const [startDate, setStartDate] = useState(getTomorrow);

  const handleExport = () => {
    const date = new Date(startDate + "T00:00:00");
    const ics = generateICS(itinerary, date, city);
    downloadICS(ics, city);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="px-6 py-5 border-b border-[var(--color-border)]/50 flex items-center justify-between">
          <h2 className="font-bold text-lg text-[var(--color-text)]">
            Export to Calendar
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] flex items-center justify-center transition-colors duration-200 cursor-pointer"
          >
            <svg
              width="16"
              height="16"
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

        <div className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="export-start-date"
              className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5"
            >
              Trip start date
            </label>
            <input
              id="export-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
            />
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            {itinerary.days.length} day{itinerary.days.length !== 1 ? "s" : ""} of events will be added to your calendar.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] transition-colors duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .ics
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
