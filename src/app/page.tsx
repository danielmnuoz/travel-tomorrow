"use client";

import { useState, useEffect, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import Navbar from "@/components/Navbar";
import TripForm from "@/components/TripForm";
import TripSummary from "@/components/TripSummary";
import ItineraryBoard from "@/components/ItineraryBoard";
import MapSection from "@/components/MapSection";
import UndoToast from "@/components/UndoToast";
import { fetchItinerary, mapFormToRequest, refreshStop } from "@/services/itinerary";
import type { DayPlan, ItineraryResponse, PlaceStop } from "@/types/itinerary";
import type { TripFormData } from "@/components/TripForm";

interface DeletedStopInfo {
  dayNumber: number;
  stop: PlaceStop;
  index: number;
}

export default function Home() {
  const [formData, setFormData] = useState<TripFormData | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeView, setActiveView] = useState<"planning" | "map">("planning");

  // Deferred map state
  const [mapStops, setMapStops] = useState<PlaceStop[]>([]);
  const [mapDirty, setMapDirty] = useState(false);

  // Undo delete state
  const [deletedStopInfo, setDeletedStopInfo] = useState<DeletedStopInfo | null>(null);

  const showResults = itinerary !== null && !isLoading && !error;
  const selectedDay = itinerary?.days.find((d) => d.day_number === selectedDayNumber);

  // Sync mapStops when selected day changes or stops change
  useEffect(() => {
    if (selectedDay) {
      setMapStops(selectedDay.stops);
      setMapDirty(false);
    }
  }, [selectedDay]);

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

  const handleStopRefreshed = (dayNumber: number, oldFsqId: string, newStop: PlaceStop) => {
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
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  };

  const handleEditStop = useCallback((dayNumber: number, fsqId: string, updates: Partial<Pick<PlaceStop, "name" | "time_slot" | "description">>) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          return {
            ...day,
            stops: day.stops.map((stop) =>
              stop.fsq_id === fsqId ? { ...stop, ...updates } : stop
            ),
          };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleDeleteStop = useCallback((dayNumber: number, fsqId: string) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const day = prev.days.find((d) => d.day_number === dayNumber);
      const stopIndex = day?.stops.findIndex((s) => s.fsq_id === fsqId) ?? -1;
      const stop = day?.stops[stopIndex];

      if (stop && stopIndex !== -1) {
        setDeletedStopInfo({ dayNumber, stop, index: stopIndex });
      }

      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          return {
            ...day,
            stops: day.stops.filter((s) => s.fsq_id !== fsqId),
          };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleUndoDelete = useCallback(() => {
    if (!deletedStopInfo) return;
    const { dayNumber, stop, index } = deletedStopInfo;
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          const newStops = [...day.stops];
          newStops.splice(index, 0, stop);
          return { ...day, stops: newStops };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
    setDeletedStopInfo(null);
  }, [deletedStopInfo, selectedDayNumber]);

  const handleReorderStop = useCallback((dayNumber: number, timeSlot: string, oldIndex: number, newIndex: number) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          const slotIndices: number[] = [];
          day.stops.forEach((s, i) => {
            if (s.time_slot.toLowerCase() === timeSlot) slotIndices.push(i);
          });
          const reordered = arrayMove(
            slotIndices.map((i) => day.stops[i]),
            oldIndex,
            newIndex
          );
          const newStops = [...day.stops];
          slotIndices.forEach((origIdx, i) => {
            newStops[origIdx] = reordered[i];
          });
          return { ...day, stops: newStops };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleMoveStopToSlot = useCallback((dayNumber: number, fsqId: string, newTimeSlot: string) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          return {
            ...day,
            stops: day.stops.map((stop) =>
              stop.fsq_id === fsqId ? { ...stop, time_slot: newTimeSlot } : stop
            ),
          };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleMoveStopToDay = useCallback((fromDay: number, fsqId: string, toDay: number) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const sourceDay = prev.days.find((d) => d.day_number === fromDay);
      const stop = sourceDay?.stops.find((s) => s.fsq_id === fsqId);
      if (!stop) return prev;

      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number === fromDay) {
            return { ...day, stops: day.stops.filter((s) => s.fsq_id !== fsqId) };
          }
          if (day.day_number === toDay) {
            return { ...day, stops: [...day.stops, stop] };
          }
          return day;
        }),
      };
    });
    if (fromDay === selectedDayNumber || toDay === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleMoveStopToDayAndSlot = useCallback((fromDay: number, fsqId: string, toDay: number, newTimeSlot: string) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const sourceDay = prev.days.find((d) => d.day_number === fromDay);
      const stop = sourceDay?.stops.find((s) => s.fsq_id === fsqId);
      if (!stop) return prev;

      const movedStop = { ...stop, time_slot: newTimeSlot };

      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number === fromDay) {
            return { ...day, stops: day.stops.filter((s) => s.fsq_id !== fsqId) };
          }
          if (day.day_number === toDay) {
            return { ...day, stops: [...day.stops, movedStop] };
          }
          return day;
        }),
      };
    });
    if (fromDay === selectedDayNumber || toDay === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleAddStop = useCallback((dayNumber: number, stop: PlaceStop) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((day) => {
          if (day.day_number !== dayNumber) return day;
          return { ...day, stops: [...day.stops, stop] };
        }),
      };
    });
    if (dayNumber === selectedDayNumber) setMapDirty(true);
  }, [selectedDayNumber]);

  const handleAddDay = useCallback(() => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const nextDayNumber = prev.days.length > 0
        ? Math.max(...prev.days.map((d) => d.day_number)) + 1
        : 1;
      const newDay: DayPlan = {
        day_number: nextDayNumber,
        neighborhood: "",
        theme: "",
        stops: [],
      };
      return { ...prev, days: [...prev.days, newDay] };
    });
    // Select the new day after state updates
    setItinerary((prev) => {
      if (!prev) return prev;
      const lastDay = prev.days[prev.days.length - 1];
      if (lastDay) setSelectedDayNumber(lastDay.day_number);
      return prev;
    });
  }, []);

  const handleRemap = useCallback(() => {
    if (selectedDay) {
      setMapStops(selectedDay.stops);
      setMapDirty(false);
    }
  }, [selectedDay]);

  return (
    <>
      <Navbar compact={showResults && !isFormExpanded}>
        {showResults && !isFormExpanded && formData && (
          <TripSummary
            data={formData}
            onEdit={handleEdit}
            onViewMap={() => setActiveView("map")}
            totalStops={
              itinerary!.days.reduce((acc, d) => acc + d.stops.length, 0)
            }
            totalDays={itinerary!.days.length}
            itinerary={itinerary}
          />
        )}
      </Navbar>
      <main className="min-h-screen">
        {/* Form */}
        {isFormExpanded && (
          <div className="py-12 px-6 animate-fade-in">
            <TripForm
              onSubmit={handleFormSubmit}
              onCancel={formData ? () => setIsFormExpanded(false) : undefined}
            />
          </div>
        )}

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

        {/* Itinerary results — two-panel layout: Planning + Map */}
        {showResults && !isFormExpanded && formData && (
          <div
            className="overflow-hidden animate-fade-in-up"
            style={{ height: "calc(100vh - 3.5rem)" }}
          >
            <div
              className="transition-transform duration-500 ease-in-out"
              style={{
                transform:
                  activeView === "map"
                    ? "translateY(calc(-100vh + 3.5rem))"
                    : undefined,
              }}
            >
              {/* Planning View */}
              <div
                className="flex flex-col"
                style={{ height: "calc(100vh - 3.5rem)" }}
              >
                <ItineraryBoard
                  days={itinerary.days}
                  city={itinerary.city}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={setSelectedDayNumber}
                  onEditStop={handleEditStop}
                  onDeleteStop={handleDeleteStop}
                  onReorderStop={handleReorderStop}
                  onMoveStopToSlot={handleMoveStopToSlot}
                  onMoveStopToDay={handleMoveStopToDay}
                  onMoveStopToDayAndSlot={handleMoveStopToDayAndSlot}
                  onAddStop={handleAddStop}
                  onAddDay={handleAddDay}
                />
              </div>

              {/* Map View */}
              <div
                className="flex flex-col"
                style={{ height: "calc(100vh - 3.5rem)" }}
              >
                <MapSection
                  days={itinerary.days}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={setSelectedDayNumber}
                  mapStops={mapStops}
                  mapDirty={mapDirty}
                  onRemap={handleRemap}
                  city={itinerary.city}
                  onBack={() => setActiveView("planning")}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Undo toast */}
      {deletedStopInfo && (
        <UndoToast
          message={`"${deletedStopInfo.stop.name}" removed`}
          onUndo={handleUndoDelete}
          onDismiss={() => setDeletedStopInfo(null)}
        />
      )}
    </>
  );
}
