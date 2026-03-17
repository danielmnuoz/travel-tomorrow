"use client";

import { RefreshCw } from "lucide-react";

interface RemapButtonProps {
  onClick: () => void;
}

export default function RemapButton({ onClick }: RemapButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--color-primary)] shadow-lg hover:opacity-90 transition-all duration-200 cursor-pointer animate-fade-in-up"
    >
      <RefreshCw size={14} strokeWidth={2} />
      Remap Routes
    </button>
  );
}
