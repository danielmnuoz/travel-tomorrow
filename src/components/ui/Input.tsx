"use client";

import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextInput({ label, className = "", ...props }: TextInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function SelectInput({
  label,
  options,
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all duration-200 appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
