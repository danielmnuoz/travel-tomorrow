"use client";

import { useEffect, useState, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import type { PlaceStop, DayOverlay, LatLng } from "@/types/itinerary";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "DEMO_MAP_ID";

interface GoogleMapViewProps {
  stops: PlaceStop[];
  dayColor: string;
  allDays?: DayOverlay[];
  cityCenter?: LatLng;
}

function FitBoundsController({ stops, cityCenter }: { stops: PlaceStop[]; cityCenter?: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (stops.length === 0) {
      map.setCenter(cityCenter ?? { lat: 40.7128, lng: -74.006 });
      map.setZoom(12);
    } else if (stops.length === 1) {
      map.setCenter({ lat: stops[0].latitude, lng: stops[0].longitude });
      map.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      stops.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      map.fitBounds(bounds, 50);
    }
  }, [map, stops, cityCenter]);

  return null;
}

function MarkerPin({ color, label, size = 26 }: { color: string; label: string | number; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size === 26 ? 12 : 10,
        fontWeight: 700,
        border: "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.3)",
      }}
    >
      {label}
    </div>
  );
}

function useDirectionsRoute(stops: PlaceStop[]): google.maps.LatLngLiteral[] {
  const [route, setRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const cacheRef = useRef<globalThis.Map<string, google.maps.LatLngLiteral[]>>(new globalThis.Map());

  useEffect(() => {
    if (stops.length < 2) {
      setRoute([]);
      return;
    }

    const cacheKey = stops.map((s) => `${s.latitude},${s.longitude}`).join("|");
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setRoute(cached);
      return;
    }

    const origin = { lat: stops[0].latitude, lng: stops[0].longitude };
    const destination = { lat: stops[stops.length - 1].latitude, lng: stops[stops.length - 1].longitude };
    const waypoints = stops.slice(1, -1).map((s) => ({
      location: { lat: s.latitude, lng: s.longitude },
      stopover: true,
    }));

    // Google Directions allows max 25 waypoints. Split if needed.
    if (waypoints.length > 25) {
      const allPoints = stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));
      setRoute(allPoints);
      return;
    }

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const points: google.maps.LatLngLiteral[] = [];
          result.routes[0].legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              step.path.forEach((p) => points.push({ lat: p.lat(), lng: p.lng() }));
            });
          });
          cacheRef.current.set(cacheKey, points);
          setRoute(points);
        } else {
          // Fallback: straight lines between stops
          setRoute(stops.map((s) => ({ lat: s.latitude, lng: s.longitude })));
        }
      }
    );
  }, [stops]);

  return route;
}

function RoutePolyline({ route, color, weight = 4, opacity = 0.7 }: {
  route: google.maps.LatLngLiteral[];
  color: string;
  weight?: number;
  opacity?: number;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || route.length === 0) return;

    polylineRef.current = new google.maps.Polyline({
      path: route,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
      map,
    });

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, route, color, weight, opacity]);

  return null;
}

function SingleDayLayer({ stops, dayColor }: { stops: PlaceStop[]; dayColor: string }) {
  const route = useDirectionsRoute(stops);
  const [selectedStop, setSelectedStop] = useState<PlaceStop | null>(null);

  return (
    <>
      {stops.map((stop, i) => (
        <AdvancedMarker
          key={stop.fsq_id}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={() => setSelectedStop(stop)}
        >
          <MarkerPin color={dayColor} label={i + 1} />
        </AdvancedMarker>
      ))}
      {selectedStop && (
        <InfoWindow
          position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
          onCloseClick={() => setSelectedStop(null)}
          pixelOffset={[0, -14]}
        >
          <div>
            <strong>{selectedStop.name}</strong>
            <br />
            <span style={{ color: "#666", fontSize: 12 }}>{selectedStop.category}</span>
          </div>
        </InfoWindow>
      )}
      <RoutePolyline route={route} color={dayColor} />
    </>
  );
}

function OverviewDayLayer({ day }: { day: DayOverlay }) {
  const route = useDirectionsRoute(day.stops);
  const [selectedStop, setSelectedStop] = useState<PlaceStop | null>(null);

  return (
    <>
      {day.stops.map((stop) => (
        <AdvancedMarker
          key={stop.fsq_id}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          onClick={() => setSelectedStop(stop)}
        >
          <MarkerPin color={day.color} label={day.dayNumber} size={22} />
        </AdvancedMarker>
      ))}
      {selectedStop && (
        <InfoWindow
          position={{ lat: selectedStop.latitude, lng: selectedStop.longitude }}
          onCloseClick={() => setSelectedStop(null)}
          pixelOffset={[0, -12]}
        >
          <div>
            <strong>{selectedStop.name}</strong>
            <br />
            <span style={{ color: "#666", fontSize: 12 }}>
              Day {day.dayNumber} &middot; {selectedStop.category}
            </span>
          </div>
        </InfoWindow>
      )}
      <RoutePolyline route={route} color={day.color} weight={3.5} opacity={0.6} />
    </>
  );
}

export default function GoogleMapView({ stops, dayColor, allDays, cityCenter }: GoogleMapViewProps) {
  const isOverview = !!allDays;

  const allStops = isOverview ? allDays.flatMap((d) => d.stops) : stops;

  const fallback = cityCenter ?? { lat: 40.7128, lng: -74.006 };
  const center =
    allStops.length > 0
      ? { lat: allStops[0].latitude, lng: allStops[0].longitude }
      : fallback;

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId={MAP_ID}
        style={{ width: "100%", height: "100%" }}
        disableDefaultUI
        gestureHandling="greedy"
      >
        <FitBoundsController stops={allStops} cityCenter={cityCenter} />
        {isOverview
          ? allDays.map((day) => <OverviewDayLayer key={day.dayNumber} day={day} />)
          : <SingleDayLayer stops={stops} dayColor={dayColor} />
        }
      </Map>
    </APIProvider>
  );
}
