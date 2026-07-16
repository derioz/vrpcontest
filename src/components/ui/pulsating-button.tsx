/**
 * MagicUI Pulsating Button — button with pulsing glow ring
 * Adapted from https://magicui.design/docs/components/pulsating-button
 */

import React from "react";
import { cn } from "../../lib/utils";

interface PulsatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
  children: React.ReactNode;
}

export function PulsatingButton({
  className,
  pulseColor = "#ef4444",
  duration = "1.5s",
  children,
  ...props
}: PulsatingButtonProps) {
  return (
    <button
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-sm transition-all active:scale-[0.97]",
        className
      )}
      style={
        {
          "--pulse-color": pulseColor,
          "--pulse-duration": duration,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* Pulsating ring */}
      <div
        className="absolute inset-0 rounded-[inherit] animate-admin-pulse"
        style={{
          boxShadow: `0 0 0 0 var(--pulse-color)`,
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
