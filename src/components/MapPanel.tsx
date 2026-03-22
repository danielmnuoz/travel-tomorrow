"use client";

import { useState, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, Map } from "lucide-react";
import MapWrapper from "@/components/MapWrapper";
import RemapButton from "@/components/RemapButton";
import type { PlaceStop } from "@/types/itinerary";

interface MapPanelProps {
  stops: PlaceStop[];
  mapDirty: boolean;
  onRemap: () => void;
}

export default function MapPanel({ stops, mapDirty, onRemap }: MapPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(250);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(250);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height]
  );

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(
      150,
      Math.min(window.innerHeight * 0.5, startHeight.current + delta)
    );
    setHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizing.current = false;
  }, []);

  return (
    <div
      className="border-t border-[var(--color-border)] bg-white shrink-0 relative transition-[height] duration-200"
      style={{ height: collapsed ? 40 : height }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-10 flex items-center justify-center hover:bg-[var(--color-bg-alt)] transition-colors"
        >
          <div className="w-8 h-1 rounded-full bg-[var(--color-border)]" />
        </div>
      )}

      {/* Collapse/expand bar */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 cursor-pointer z-[5] bg-white"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
          <Map size={14} />
          {collapsed ? "Show Map" : "Map"}
        </div>
        {collapsed ? (
          <ChevronUp size={14} className="text-[var(--color-text-light)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-text-light)]" />
        )}
      </div>

      {/* Map content */}
      {!collapsed && (
        <div className="pt-10 h-full relative">
          <div className="h-full p-2 pt-0">
            <MapWrapper stops={stops} />
          </div>
          {mapDirty && <RemapButton onClick={onRemap} />}
        </div>
      )}
    </div>
  );
}
