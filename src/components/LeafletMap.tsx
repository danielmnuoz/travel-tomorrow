"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PlaceStop } from "@/types/itinerary";

function makeIcon(color: string, number: number) {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);
    ">${number}</div>`,
  });
}

function FitBounds({ stops }: { stops: PlaceStop[] }) {
  const map = useMap();

  useEffect(() => {
    if (stops.length === 0) {
      map.setView([40.7128, -74.006], 12);
    } else if (stops.length === 1) {
      map.setView([stops[0].latitude, stops[0].longitude], 15);
    } else {
      const bounds = L.latLngBounds(
        stops.map((s) => [s.latitude, s.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, stops]);

  return null;
}

interface LeafletMapProps {
  stops: PlaceStop[];
  dayColor: string;
}

const PAY_API = process.env.NEXT_PUBLIC_PAY_API === "true" || process.env.NEXT_PUBLIC_PAY_API === "1";

function fetchOSRMRoute(stops: PlaceStop[]): Promise<[number, number][]> {
  const coords = stops.map((s) => `${s.longitude},${s.latitude}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`;

  return fetch(url)
    .then((r) => r.json())
    .then((data) => {
      if (data.routes?.[0]?.geometry?.coordinates) {
        return data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
      }
      return [];
    });
}

// TODO: implement Google Directions API route fetching when PAY_API is true
// function fetchGoogleRoute(stops: PlaceStop[]): Promise<[number, number][]> { ... }

export default function LeafletMap({ stops, dayColor }: LeafletMapProps) {
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (stops.length < 2) {
      setRoute([]);
      return;
    }

    if (PAY_API) {
      // TODO: use Google Directions API for premium routing
      // fetchGoogleRoute(stops).then(setRoute).catch(() => setRoute([]));
      // Fallback to OSRM until Google Directions is implemented
      fetchOSRMRoute(stops).then(setRoute).catch(() => setRoute([]));
    } else {
      fetchOSRMRoute(stops).then(setRoute).catch(() => setRoute([]));
    }
  }, [stops]);

  const center: [number, number] =
    stops.length > 0
      ? [stops[0].latitude, stops[0].longitude]
      : [40.7128, -74.006];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds stops={stops} />

      {stops.map((stop, i) => (
        <Marker
          key={stop.fsq_id}
          position={[stop.latitude, stop.longitude]}
          icon={makeIcon(dayColor, i + 1)}
        >
          <Popup>
            <strong>{stop.name}</strong>
            <br />
            <span style={{ color: "#666", fontSize: 12 }}>{stop.category}</span>
          </Popup>
        </Marker>
      ))}

      {route.length > 0 && (
        <Polyline
          positions={route}
          pathOptions={{ color: dayColor, weight: 4, opacity: 0.7 }}
        />
      )}
    </MapContainer>
  );
}
