interface NavbarProps {
  children?: React.ReactNode;
  compact?: boolean;
}

export default function Navbar({ children, compact }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
        <span
          className={`font-bold text-[var(--color-text)] shrink-0 ${
            compact ? "hidden sm:block text-base" : "text-2xl"
          }`}
        >
          Travel Tomorrow
        </span>
        {children && (
          <>
            <div className="hidden sm:block w-px h-5 bg-[var(--color-border)] shrink-0" />
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {children}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
