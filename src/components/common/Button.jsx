"use client";
// components/common/Button.jsx
// Reusable button with variant + size support.

import { cn } from "@/lib/utils";

const variants = {
  primary:   "bg-[#1e3a5f] text-white hover:bg-[#2a5298] active:bg-[#12253d]",
  secondary: "bg-white text-[#1e3a5f] border border-[#1e3a5f] hover:bg-blue-50",
  accent:    "bg-[#c8973a] text-white hover:bg-[#b07d2a]",
  ghost:     "bg-transparent text-[#1e3a5f] hover:bg-blue-50",
  danger:    "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm:  "px-3 py-1.5 text-sm",
  md:  "px-4 py-2 text-sm",
  lg:  "px-6 py-2.5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors duration-150 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
