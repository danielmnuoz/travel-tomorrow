"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import type { PlaceStop, PlaceSearchResult } from "@/types/itinerary";

interface AddPlaceSearchProps {
  dayNumber: number;
  city: string;
  onAddStop: (dayNumber: number, stop: PlaceStop) => void;
}

export default function AddPlaceSearch({
  dayNumber,
  city,
  onAddStop,
}: AddPlaceSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("afternoon");
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/places/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`
        );
        if (res.ok) setResults(await res.json());
      } catch {
        /* ignore */
      }
      setIsSearching(false);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, city]);

  const handleSelect = (result: PlaceSearchResult) => {
    const stop: PlaceStop = {
      fsq_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      category: result.category ?? "activity",
      time_slot: selectedSlot,
      icon: "map-pin",
      description: result.display_name,
    };
    onAddStop(dayNumber, stop);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="mt-2 w-full py-2 rounded-lg text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-wash)] hover:bg-[var(--color-primary-lighter)] transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Plus size={13} /> Add Place
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-light)]"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place..."
            className="w-full text-xs text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-[var(--color-primary)]/50"
          />
        </div>
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="text-[10px] font-medium text-[var(--color-text-muted)] bg-white border border-[var(--color-border)] rounded-lg px-1.5 py-1.5 outline-none cursor-pointer"
        >
          <option value="morning">AM</option>
          <option value="afternoon">PM</option>
          <option value="evening">EVE</option>
        </select>
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery("");
            setResults([]);
          }}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer"
        >
          <X size={12} className="text-[var(--color-text-light)]" />
        </button>
      </div>

      {/* Results */}
      {(results.length > 0 || isSearching) && (
        <div className="bg-white border border-[var(--color-border)] rounded-lg shadow-sm max-h-40 overflow-y-auto">
          {isSearching && (
            <div className="px-3 py-2 text-[10px] text-[var(--color-text-light)]">
              Searching...
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-alt)] transition-colors cursor-pointer border-b border-[var(--color-border)]/30 last:border-0"
            >
              <span className="font-medium">{r.name}</span>
              <span className="block text-[10px] text-[var(--color-text-light)] truncate mt-0.5">
                {r.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
