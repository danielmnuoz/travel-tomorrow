import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-2xl text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors duration-200"
        >
          Travel Tomorrow
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="#"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="/plan"
            className="text-sm font-medium bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-full hover:bg-[var(--color-primary-light)] transition-all duration-200 hover:shadow-md hover:shadow-[var(--color-primary)]/20"
          >
            Start Planning
          </Link>
        </div>
      </div>
    </nav>
  );
}
