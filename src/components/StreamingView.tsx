"use client";

import { useEffect, useRef } from "react";

interface StreamingViewProps {
  status: string;
  thinking: string;
  tokens: string;
}

export default function StreamingView({ status, thinking, tokens }: StreamingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasContent = thinking || tokens;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, tokens]);

  return (
    <div className="flex flex-col items-center justify-start py-16 px-6 animate-fade-in max-w-2xl mx-auto w-full">
      {/* Status pill */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {status}
        </span>
      </div>

      {/* Streaming content display */}
      {hasContent && (
        <div
          ref={scrollRef}
          className="w-full max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4"
        >
          {/* Thinking section */}
          {thinking && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.4-1.2 4.5-3 5.7V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 0 1 7-7z" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
                <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Thinking
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)] whitespace-pre-wrap break-words">
                {thinking}
                {!tokens && (
                  <span className="inline-block w-1.5 h-4 bg-[var(--color-primary)] animate-pulse align-text-bottom ml-0.5" />
                )}
              </p>
            </div>
          )}

          {/* JSON output section */}
          {tokens && (
            <div>
              {thinking && (
                <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Building itinerary
                  </span>
                </div>
              )}
              <pre className="text-xs leading-relaxed text-[var(--color-text-muted)] whitespace-pre-wrap break-words font-mono mt-2">
                {tokens}
                <span className="inline-block w-1.5 h-4 bg-[var(--color-primary)] animate-pulse align-text-bottom ml-0.5" />
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Waiting state before any content arrives */}
      {!hasContent && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Preparing your trip...
          </p>
        </div>
      )}
    </div>
  );
}
