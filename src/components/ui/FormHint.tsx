export default function FormHint({ message }: { message: string }) {
  return (
    <p className="text-xs text-[var(--color-text-light)] mt-3 animate-fade-in">
      {message}
    </p>
  );
}
