"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SelectInput, TextInput } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormHint from "@/components/ui/FormHint";
import { getFormHints } from "@/lib/formHints";
import type { Neighborhood, MustVisitPlace, PlaceSearchResult, PlaceCategory } from "@/types/itinerary";
import {
  Utensils,
  Coffee,
  Target,
  Landmark,
  ShoppingBag,
  Moon,
  type LucideIcon,
} from "lucide-react";

const CITIES = [
  { value: "nyc", label: "New York City" },
  { value: "paris", label: "Paris" },
  { value: "tokyo", label: "Tokyo" },
  { value: "london", label: "London" },
  { value: "barcelona", label: "Barcelona" },
];

const FOOD_STYLES = ["Local", "Street Food", "Casual", "Fine Dining", "Touristy"];
const CUISINES = ["Italian", "Japanese", "Mexican", "Chinese", "Thai", "Indian", "French", "Korean", "Mediterranean", "American"];
const INTERESTS = ["Museums", "Nightlife", "Cafes", "Shopping", "Parks", "History"];
const TRANSPORT = ["Walk", "Metro", "Mix"];

export interface TripFormData {
  city: string;
  cityLabel: string;
  days: string;
  address: string;
  budget: number;
  foodStyles: string[];
  interests: string[];
  pace: number;
  transport: string;
  neighborhoods?: string[];
  cuisines?: string[];
  mustVisits?: MustVisitPlace[];
  maxFoodStops?: number | null;
}

const CATEGORY_OPTIONS: { value: PlaceCategory; label: string; Icon: LucideIcon }[] = [
  { value: "food", label: "Meal", Icon: Utensils },
  { value: "cafe", label: "Cafe", Icon: Coffee },
  { value: "activity", label: "Activity", Icon: Target },
  { value: "landmark", label: "Landmark", Icon: Landmark },
  { value: "shopping", label: "Shopping", Icon: ShoppingBag },
  { value: "nightlife", label: "Nightlife", Icon: Moon },
];

function ChipSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-lighter)] hover:text-[var(--color-primary)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadioSelect({
  label,
  subtitle,
  options,
  selected,
  onSelect,
  allowDeselect,
}: {
  label: string;
  subtitle?: string;
  options: string[];
  selected: string;
  onSelect: (option: string | null) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-medium text-[var(--color-text)] ${subtitle ? "mb-1" : "mb-3"}`}>
        {label}
      </label>
      {subtitle && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">{subtitle}</p>
      )}
      <div className="flex gap-2">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                onSelect(allowDeselect && isSelected ? null : option)
              }
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-lighter)] hover:text-[var(--color-primary)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  onCancel?: () => void;
}

export default function TripForm({ onSubmit, onCancel }: TripFormProps) {
  const [city, setCity] = useState("nyc");
  const [days, setDays] = useState("3");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState(2);
  const [foodStyles, setFoodStyles] = useState<string[]>(["Local"]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>(["Cafes"]);
  const [pace, setPace] = useState(3);
  const [transport, setTransport] = useState("Mix");
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<Neighborhood[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mustVisits, setMustVisits] = useState<MustVisitPlace[]>([]);
  const mustVisitCounter = useRef(0);
  const [openCategoryPickerId, setOpenCategoryPickerId] = useState<string | null>(null);
  const [maxFoodStops, setMaxFoodStops] = useState<number | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const placeSearchRef = useRef<HTMLDivElement>(null);
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setNeighborhoods([]);
    setAdvancedOpen(false);
    fetch(`/api/neighborhoods?city=${encodeURIComponent(city)}`)
      .then((res) => res.json())
      .then((data) => setAvailableNeighborhoods(data.neighborhoods ?? []))
      .catch(() => setAvailableNeighborhoods([]));
  }, [city]);

  const searchPlaces = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (query.trim().length < 3) {
        setPlaceResults([]);
        setShowPlaceDropdown(false);
        return;
      }
      setPlaceSearching(true);
      debounceRef.current = setTimeout(async () => {
        const cityLabel = CITIES.find((c) => c.value === city)?.label ?? city;
        try {
          const res = await fetch(
            `/api/places/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(cityLabel)}`
          );
          const data: PlaceSearchResult[] = await res.json();
          setPlaceResults(data);
          setShowPlaceDropdown(data.length > 0);
        } catch {
          setPlaceResults([]);
        } finally {
          setPlaceSearching(false);
        }
      }, 1000);
    },
    [city]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (placeSearchRef.current && !placeSearchRef.current.contains(e.target as Node)) {
        setShowPlaceDropdown(false);
      }
      if (openCategoryPickerId) {
        const target = e.target as Node;
        if (categoryPickerRef.current && !categoryPickerRef.current.contains(target)) {
          setOpenCategoryPickerId(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openCategoryPickerId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const addMustVisit = (result: PlaceSearchResult) => {
    const place: MustVisitPlace = {
      id: `pinned-${mustVisitCounter.current++}`,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      category: result.category ?? "activity",
    };
    setMustVisits((prev) => [...prev, place]);
    setPlaceQuery("");
    setPlaceResults([]);
    setShowPlaceDropdown(false);
  };

  const removeMustVisit = (id: string) => {
    setMustVisits((prev) => prev.filter((p) => p.id !== id));
    setOpenCategoryPickerId(null);
  };

  const updateMustVisitCategory = (id: string, category: PlaceCategory) => {
    setMustVisits((prev) =>
      prev.map((p) => (p.id === id ? { ...p, category } : p))
    );
    setOpenCategoryPickerId(null);
  };

  const hints = getFormHints({
    budget,
    foodStyles,
    interests,
    pace,
    transport,
    neighborhoods,
    days: Number(days) || 1,
  });

  const toggleChip = (list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityLabel = CITIES.find((c) => c.value === city)?.label ?? city;
    onSubmit({
      city,
      cityLabel,
      days,
      address,
      budget,
      foodStyles,
      cuisines: cuisines.length > 0 ? cuisines : undefined,
      interests,
      pace,
      transport,
      neighborhoods: neighborhoods.length > 0 ? neighborhoods : undefined,
      mustVisits: mustVisits.length > 0 ? mustVisits : undefined,
      maxFoodStops: maxFoodStops ?? undefined,
    });
  };

  const BUDGET_OPTIONS = [
    { value: "1", label: "$  —  Budget" },
    { value: "2", label: "$$  —  Mid-range" },
    { value: "3", label: "$$$  —  Upscale" },
    { value: "4", label: "$$$$  —  Luxury" },
  ];

  const PACE_OPTIONS = [
    { value: "1", label: "Relaxed" },
    { value: "3", label: "Moderate" },
    { value: "5", label: "Packed" },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {/* Back arrow (editing mode only) */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-200 cursor-pointer mb-6"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-bold text-4xl sm:text-5xl text-[var(--color-text)] mb-3">
          Plan your trip
        </h1>
        <p className="text-[var(--color-text-muted)]">
          Tell us what you love. We&apos;ll handle the rest.
        </p>
      </div>

      <div className="space-y-4">
        {/* Destination + Style — combined card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-4">
            Destination &amp; Style
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SelectInput
              label="City"
              options={CITIES}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <TextInput
              label="Days"
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <SelectInput
              label="Budget"
              options={BUDGET_OPTIONS}
              value={String(budget)}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <SelectInput
              label="Pace"
              options={PACE_OPTIONS}
              value={String(pace)}
              onChange={(e) => setPace(Number(e.target.value))}
            />
          </div>
          <div className="mt-3">
            <TextInput
              label="Stay Address"
              type="text"
              placeholder="e.g. 768 5th Ave, New York"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          {hints.filter((h) => h.section === "style").map((h) => (
            <FormHint key={h.id} message={h.message} />
          ))}
        </div>

        {/* Food, Interests & Transport — combined card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-4">
            Preferences
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ChipSelect
              label="Food Style"
              options={FOOD_STYLES}
              selected={foodStyles}
              onToggle={(item) => setFoodStyles(toggleChip(foodStyles, item))}
            />
            <ChipSelect
              label="Interests"
              options={INTERESTS}
              selected={interests}
              onToggle={(item) => setInterests(toggleChip(interests, item))}
            />
          </div>
          {hints.filter((h) => h.section === "preferences").map((h) => (
            <FormHint key={h.id} message={h.message} />
          ))}
          <div className="mt-5 pt-4 border-t border-[var(--color-border)]/50">
            <RadioSelect
              label="Transport"
              options={TRANSPORT}
              selected={transport}
              onSelect={(v) => v && setTransport(v)}
            />
            {hints.filter((h) => h.section === "transport").map((h) => (
              <FormHint key={h.id} message={h.message} />
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border)]/50">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-5 cursor-pointer"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)]">
              Advanced Options
            </h2>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-[var(--color-text-muted)] transition-transform duration-200 ${
                advancedOpen ? "rotate-180" : ""
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {advancedOpen && (
            <div className="px-5 pb-5">
              {availableNeighborhoods.length > 0 && (
                <>
                  <ChipSelect
                    label="Neighborhoods"
                    options={availableNeighborhoods.map((n) => n.name)}
                    selected={neighborhoods.map(
                      (id) =>
                        availableNeighborhoods.find((n) => n.id === id)?.name ?? id
                    )}
                    onToggle={(name) => {
                      const hood = availableNeighborhoods.find(
                        (n) => n.name === name
                      );
                      if (hood) {
                        setNeighborhoods(toggleChip(neighborhoods, hood.id));
                      }
                    }}
                  />
                  {neighborhoods.length > 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-3">
                      {neighborhoods.length} selected — each day will focus on a
                      neighborhood area
                    </p>
                  )}
                </>
              )}
                {/* Cuisine Preference */}
                <div className="mt-6">
                  <ChipSelect
                    label="Cuisine Preference"
                    options={CUISINES}
                    selected={cuisines}
                    onToggle={(item) => setCuisines(toggleChip(cuisines, item))}
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-3">
                    Other cuisines may still appear — this just nudges recommendations your way.
                  </p>
                </div>
                {/* Must-Visit Places */}
                <div className="mt-6" ref={placeSearchRef}>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
                    Must-Visit Spots
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    Add places you definitely want to visit — we&apos;ll build the rest of the itinerary around them.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      value={placeQuery}
                      onChange={(e) => {
                        setPlaceQuery(e.target.value);
                        searchPlaces(e.target.value);
                      }}
                      onFocus={() => {
                        if (placeResults.length > 0) setShowPlaceDropdown(true);
                      }}
                      placeholder="Search for a place..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                    {placeSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                      </div>
                    )}
                    {showPlaceDropdown && (
                      <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-[var(--color-border)] shadow-lg overflow-hidden">
                        {placeResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addMustVisit(result)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-alt)] transition-colors duration-150 cursor-pointer border-b border-[var(--color-border)]/30 last:border-b-0"
                          >
                            <span className="block text-sm font-medium text-[var(--color-text)]">
                              {result.name}
                            </span>
                            <span className="block text-xs text-[var(--color-text-muted)] truncate">
                              {result.display_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {mustVisits.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mustVisits.map((place) => {
                        const cat = CATEGORY_OPTIONS.find((c) => c.value === place.category) ?? CATEGORY_OPTIONS[2];
                        const isPickerOpen = openCategoryPickerId === place.id;
                        return (
                          <div key={place.id} className="relative">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[var(--color-primary-lighter)] text-[var(--color-primary)]">
                              {place.name}
                              <button
                                type="button"
                                onClick={() => setOpenCategoryPickerId(isPickerOpen ? null : place.id)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 rounded-full px-1.5 py-0.5 transition-colors cursor-pointer"
                                title="Change category"
                              >
                                <cat.Icon size={10} /> {cat.label}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMustVisit(place.id)}
                                className="w-4 h-4 rounded-full hover:bg-[var(--color-primary)]/10 flex items-center justify-center cursor-pointer"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </button>
                            </span>
                            {isPickerOpen && (
                              <div ref={categoryPickerRef} className="absolute top-full left-0 mt-1.5 z-30 bg-white border border-[var(--color-border)] rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 w-48">
                                {CATEGORY_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateMustVisitCategory(place.id, opt.value)}
                                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                                      place.category === opt.value
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"
                                    }`}
                                  >
                                    <opt.Icon size={16} />
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <RadioSelect
                    label="Max food stops per day"
                    subtitle="Meals, cafes, and snacks combined. Leave unset for no limit."
                    options={["1", "2", "3", "4"]}
                    selected={maxFoodStops?.toString() ?? ""}
                    onSelect={(v) => setMaxFoodStops(v ? parseInt(v) : null)}
                    allowDeselect
                  />
                </div>

                {hints.filter((h) => h.section === "advanced").map((h) => (
                  <FormHint key={h.id} message={h.message} />
                ))}
              </div>
            )}
          </div>

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full">
          Generate Itinerary
        </Button>
      </div>
    </form>
  );
}
