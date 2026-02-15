import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft radial gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[var(--color-primary)]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-[var(--color-primary-lighter)]/40 blur-3xl" />

        {/* Topographic-style decorative lines */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.035]"
          viewBox="0 0 800 800"
          fill="none"
        >
          {[200, 250, 300, 350].map((r) => (
            <circle
              key={r}
              cx="400"
              cy="400"
              r={r}
              stroke="var(--color-primary)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        {/* Small badge */}
        <div
          className="animate-fade-in-up inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-[var(--color-primary-wash)] border border-[var(--color-primary)]/10 text-sm text-[var(--color-primary)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Vibe-first trip planning
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in-up font-bold text-6xl sm:text-7xl md:text-8xl leading-[1.05] tracking-tight text-[var(--color-text)] mb-6"
          style={{ animationDelay: "0.1s" }}
        >
          Travel
          <br />
          <span className="text-[var(--color-primary)]">Tomorrow</span>
        </h1>

        {/* Tagline */}
        <p
          className="animate-fade-in-up text-lg sm:text-xl text-[var(--color-text-muted)] mb-12 max-w-md mx-auto leading-relaxed"
          style={{ animationDelay: "0.2s" }}
        >
          Plan trips by vibe, not spreadsheets. Tell us what you love — we&apos;ll build the itinerary.
        </p>

        {/* CTA */}
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: "0.35s" }}
        >
          <Link
            href="/plan"
            className="group inline-flex items-center gap-3 bg-[var(--color-primary)] text-white text-lg font-medium px-8 py-4 rounded-full hover:bg-[var(--color-primary-light)] transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20 hover:-translate-y-0.5"
          >
            Plan a Trip
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Subtle bottom hint */}
        <p
          className="animate-fade-in-up mt-16 text-xs text-[var(--color-text-light)] tracking-wide uppercase"
          style={{ animationDelay: "0.5s" }}
        >
          NYC &middot; Paris &middot; Tokyo &middot; London &middot; Barcelona
        </p>
      </div>
    </section>
  );
}
