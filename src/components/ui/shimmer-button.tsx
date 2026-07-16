/**
 * MagicUI Shimmer Button — button with traveling shimmer effect
 * Adapted from https://magicui.design/docs/components/shimmer-button
 */

import React from "react";
import { cn } from "../../lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
}

export function ShimmerButton({
  className,
  shimmerColor = "#ea580c",
  shimmerSize = "0.1em",
  borderRadius = "0.75rem",
  shimmerDuration = "2.5s",
  background = "rgba(0, 0, 0, 0.9)",
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative overflow-hidden whitespace-nowrap px-6 py-3 font-bold transition-all duration-300",
        "hover:shadow-[0_0_30px_rgba(234,88,12,0.3)] active:scale-[0.98]",
        className
      )}
      style={
        {
          "--shimmer-speed": shimmerDuration,
          "--shimmer-color": shimmerColor,
          "--shimmer-radius": borderRadius,
          "--shimmer-bg": background,
          borderRadius: borderRadius,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* Shimmer layer */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{ background: "var(--shimmer-bg)" }}
      >
        <div
          className="absolute inset-[-100%] animate-shimmer-slide"
          style={{
            background: `conic-gradient(from 0deg, transparent 0 340deg, var(--shimmer-color) 360deg)`,
            animationDuration: "var(--shimmer-speed)",
          }}
        />
      </div>

      {/* Inner background to hide shimmer center */}
      <div
        className="absolute inset-px rounded-[inherit]"
        style={{ background: "var(--shimmer-bg)" }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 text-white">
        {children}
      </span>
    </button>
  );
}
