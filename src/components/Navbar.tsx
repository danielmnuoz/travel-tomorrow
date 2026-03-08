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
        <div className="flex items-center gap-8" />
      </div>
    </nav>
  );
}
