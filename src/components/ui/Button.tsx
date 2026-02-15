import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] hover:shadow-lg hover:shadow-[var(--color-primary)]/20 hover:-translate-y-0.5",
  secondary:
    "border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)]",
  ghost:
    "text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-wash)]",
};

const sizeStyles = {
  sm: "text-sm px-4 py-2",
  md: "text-sm px-6 py-3",
  lg: "text-base px-8 py-4",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-medium rounded-full transition-all duration-200 cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
