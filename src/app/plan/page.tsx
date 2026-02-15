"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TripForm from "@/components/TripForm";
import TripSummary from "@/components/TripSummary";
import DayCard from "@/components/DayCard";
import MapContainer from "@/components/MapContainer";
import DayDetailView from "@/components/DayDetailView";
import { mockItinerary } from "@/data/mock-itinerary";
import type { TripFormData } from "@/components/TripForm";

export default function PlanPage() {
  const [formData, setFormData] = useState<TripFormData | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [selectedDayId, setSelectedDayId] = useState(mockItinerary.days[0].id);
  const [detailDayId, setDetailDayId] = useState<number | null>(null);

  const showResults = formData !== null;
  const selectedDay = mockItinerary.days.find((d) => d.id === selectedDayId)!;
  const detailDay = detailDayId
    ? mockItinerary.days.find((d) => d.id === detailDayId)
    : null;

  const handleFormSubmit = (data: TripFormData) => {
    setFormData(data);
    setIsFormExpanded(false);
    window.scrollTo({ top: 0 });
  };

  const handleEdit = () => {
    setIsFormExpanded(true);
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
        ) : formData ? (
          <div className="sticky top-16 z-40 animate-fade-in">
            <TripSummary
              data={formData}
              onEdit={handleEdit}
              days={mockItinerary.days}
              selectedDayId={selectedDayId}
              onSelectDay={setSelectedDayId}
              totalStops={mockItinerary.days.reduce(
                (acc, d) => acc + d.stops.length,
                0
              )}
            />
          </div>
        ) : null}

        {/* Itinerary results */}
        {showResults && !isFormExpanded && (
          <div className="animate-fade-in-up">
            {/* Main content: split layout */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-14rem)]">
              {/* Map (mobile: top) */}
              <div className="lg:hidden h-64 p-3">
                <MapContainer stops={selectedDay.stops} />
              </div>

              {/* Left panel: day cards */}
              <div className="flex-1 lg:w-[40%] lg:max-w-[520px] overflow-y-auto p-4 sm:p-6 space-y-4">
                {mockItinerary.days.map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    isSelected={selectedDayId === day.id}
                    onSelect={() => setSelectedDayId(day.id)}
                    onViewDetails={() => setDetailDayId(day.id)}
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
      {detailDay && (
        <DayDetailView day={detailDay} onClose={() => setDetailDayId(null)} />
      )}
    </>
  );
}
