"use client";

import { useEffect, useState } from "react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-text)] text-white shadow-lg transition-all duration-300 ${
        exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0 animate-fade-in-up"
      }`}
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={() => {
          onUndo();
          onDismiss();
        }}
        className="text-sm font-semibold text-[var(--color-primary-lighter)] hover:text-white transition-colors cursor-pointer"
      >
        Undo
      </button>
    </div>
  );
}
