"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TripForm from "@/components/TripForm";
import TripSummary from "@/components/TripSummary";
import DayCard from "@/components/DayCard";
import MapContainer from "@/components/MapContainer";
import DayDetailView from "@/components/DayDetailView";
import { fetchItinerary, mapFormToRequest, refreshStop } from "@/services/itinerary";
import type { ItineraryResponse } from "@/types/itinerary";
import type { TripFormData } from "@/components/TripForm";

export default function Home() {
  const [formData, setFormData] = useState<TripFormData | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [detailDayNumber, setDetailDayNumber] = useState<number | null>(null);

  const showResults = itinerary !== null && !isLoading && !error;
  const selectedDay = itinerary?.days.find((d) => d.day_number === selectedDayNumber);
  const detailDay = detailDayNumber
    ? itinerary?.days.find((d) => d.day_number === detailDayNumber)
    : null;

  const handleFormSubmit = async (data: TripFormData) => {
    setFormData(data);
    setIsFormExpanded(false);
    setError(null);
    setIsLoading(true);
    window.scrollTo({ top: 0 });

    try {
      const result = await fetchItinerary(data);
      setItinerary(result);
      setSelectedDayNumber(result.days[0]?.day_number ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsFormExpanded(true);
  };

  const handleRetry = () => {
    setError(null);
    setIsFormExpanded(true);
  };

  const handleStopRefreshed = (dayNumber: number, oldFsqId: string, newStop: ItineraryResponse["days"][0]["stops"][0]) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          return {
            ...day,
            stops: day.stops.map((stop) =>
              stop.fsq_id === oldFsqId ? newStop : stop
            ),
          };
        }),
      };
    });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Form or Summary */}
        {isFormExpanded ? (
          <div className="py-12 px-6 animate-fade-in">
            <TripForm
              onSubmit={handleFormSubmit}
              onCancel={formData ? () => setIsFormExpanded(false) : undefined}
            />
          </div>
        ) : formData && !isLoading && !error ? (
          <div className="sticky top-16 z-40 animate-fade-in">
            <TripSummary
              data={formData}
              onEdit={handleEdit}
              days={itinerary?.days ?? []}
              selectedDayNumber={selectedDayNumber}
              onSelectDay={setSelectedDayNumber}
              totalStops={
                itinerary?.days.reduce((acc, d) => acc + d.stops.length, 0) ?? 0
              }
            />
          </div>
        ) : null}

        {/* Loading state */}
        {isLoading && !isFormExpanded && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-10 h-10 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Building your itinerary...
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm text-center">
              This can take 10-30 seconds while we plan the perfect trip for you.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !isFormExpanded && (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm text-center mb-6">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity duration-200 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Itinerary results */}
        {showResults && !isFormExpanded && selectedDay && (
          <div className="animate-fade-in-up">
            {/* Main content: split layout */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-14rem)]">
              {/* Map (mobile: top) */}
              <div className="lg:hidden h-64 p-3">
                <MapContainer stops={selectedDay.stops} />
              </div>

              {/* Left panel: day cards */}
              <div className="flex-1 lg:w-[40%] lg:max-w-[520px] overflow-y-auto p-4 sm:p-6 space-y-4">
                {itinerary.days.map((day) => (
                  <DayCard
                    key={day.day_number}
                    day={day}
                    isSelected={selectedDayNumber === day.day_number}
                    onSelect={() => setSelectedDayNumber(day.day_number)}
                    onViewDetails={() => setDetailDayNumber(day.day_number)}
                  />
                ))}
              </div>

              {/* Right panel: map (desktop only) */}
              <div className="hidden lg:block flex-1 p-4 pl-0">
                <div className="h-full sticky top-0">
                  <MapContainer stops={selectedDay.stops} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Day detail modal */}
      {detailDay && formData && (
        <DayDetailView
          day={detailDay}
          onClose={() => setDetailDayNumber(null)}
          preferences={mapFormToRequest(formData)}
          onStopRefreshed={handleStopRefreshed}
        />
      )}
    </>
  );
}
