"use client";

import { useState } from "react";
import { SelectInput, TextInput } from "@/components/ui/Input";
import Slider from "@/components/ui/Slider";
import Button from "@/components/ui/Button";

const CITIES = [
  { value: "nyc", label: "New York City" },
  { value: "paris", label: "Paris" },
  { value: "tokyo", label: "Tokyo" },
  { value: "london", label: "London" },
  { value: "barcelona", label: "Barcelona" },
];

const FOOD_STYLES = ["Cheap Eats", "Elegant", "Local", "Street Food", "Touristy"];
const INTERESTS = ["Museums", "Nightlife", "Cafes", "Walking", "Shopping", "Parks", "History"];
const TRANSPORT = ["Walk", "Metro", "Mix"];

export interface TripFormData {
  city: string;
  cityLabel: string;
  days: string;
  hotel: string;
  budget: number;
  foodStyles: string[];
  interests: string[];
  pace: number;
  transport: string;
}

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
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
        {label}
      </label>
      <div className="flex gap-2">
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
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

const budgetLabels: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

const paceLabels: Record<number, string> = {
  1: "Relaxed",
  2: "Easygoing",
  3: "Moderate",
  4: "Active",
  5: "Packed",
};

interface TripFormProps {
  onSubmit: (data: TripFormData) => void;
  onCancel?: () => void;
}

export default function TripForm({ onSubmit, onCancel }: TripFormProps) {
  const [city, setCity] = useState("nyc");
  const [days, setDays] = useState("3");
  const [hotel, setHotel] = useState("");
  const [budget, setBudget] = useState(2);
  const [foodStyles, setFoodStyles] = useState<string[]>(["Local"]);
  const [interests, setInterests] = useState<string[]>(["Walking", "Cafes"]);
  const [pace, setPace] = useState(3);
  const [transport, setTransport] = useState("Mix");

  const toggleChip = (list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityLabel = CITIES.find((c) => c.value === city)?.label ?? city;
    onSubmit({ city, cityLabel, days, hotel, budget, foodStyles, interests, pace, transport });
  };

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
      <div className="text-center mb-10">
        <h1 className="font-bold text-4xl sm:text-5xl text-[var(--color-text)] mb-3">
          Plan your trip
        </h1>
        <p className="text-[var(--color-text-muted)]">
          Tell us what you love. We&apos;ll handle the rest.
        </p>
      </div>

      <div className="space-y-6">
        {/* Destination & Duration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-5">
            Destination
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectInput
              label="City"
              options={CITIES}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <TextInput
              label="Trip Length (days)"
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <TextInput
              label="Hotel / Address"
              type="text"
              placeholder="e.g. The Plaza Hotel, 5th Ave"
              value={hotel}
              onChange={(e) => setHotel(e.target.value)}
            />
          </div>
        </div>

        {/* Budget & Pace */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-5">
            Style
          </h2>
          <div className="space-y-6">
            <Slider
              label="Budget"
              min={1}
              max={4}
              value={budget}
              onChange={setBudget}
              renderValue={(v) => budgetLabels[v]}
            />
            <Slider
              label="Pace"
              min={1}
              max={5}
              value={pace}
              onChange={setPace}
              renderValue={(v) => paceLabels[v]}
            />
          </div>
        </div>

        {/* Food & Interests */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-5">
            Preferences
          </h2>
          <div className="space-y-6">
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
        </div>

        {/* Transport */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-border)]/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)] mb-5">
            Getting Around
          </h2>
          <RadioSelect
            label="Transport Preference"
            options={TRANSPORT}
            selected={transport}
            onSelect={setTransport}
          />
        </div>

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full">
          Generate Itinerary
        </Button>
      </div>
    </form>
  );
}
