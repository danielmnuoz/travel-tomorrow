"use client";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  renderValue?: (value: number) => string;
}

export default function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  renderValue,
}: SliderProps) {
  return (
    <div>
      {(label || renderValue) && (
        <div className="flex items-center justify-between mb-3">
          {label && (
            <label className="text-sm font-medium text-[var(--color-text)]">
              {label}
            </label>
          )}
          {renderValue && (
            <span className="text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary-wash)] px-3 py-1 rounded-full">
              {renderValue(value)}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  );
}
