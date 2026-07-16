/**
 * MagicUI Border Beam — animated glowing beam that travels along the border
 * Adapted from https://magicui.design/docs/components/border-beam
 */

import React from "react";
import { cn } from "../../lib/utils";

interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
  anchor?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ea580c",
  colorTo = "#fb923c",
  delay = 0,
  ...props
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className
      )}
      style={
        {
          "--border-beam-size": `${size}px`,
          "--border-beam-duration": `${duration}s`,
          "--border-beam-anchor": `${anchor}%`,
          "--border-beam-border-width": `${borderWidth}px`,
          "--border-beam-color-from": colorFrom,
          "--border-beam-color-to": colorTo,
          "--border-beam-delay": `${delay}s`,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        className="absolute inset-[0] rounded-[inherit]"
        style={{
          borderWidth: "var(--border-beam-border-width)",
          borderStyle: "solid",
          borderImage: "none",
          borderColor: "transparent",
          maskImage: `conic-gradient(from calc(var(--border-beam-anchor) - 60deg) at 50% 50%, transparent 0%, #000 20%, #000 40%, transparent 50%)`,
          WebkitMaskImage: `conic-gradient(from calc(var(--border-beam-anchor) - 60deg) at 50% 50%, transparent 0%, #000 20%, #000 40%, transparent 50%)`,
          background: `conic-gradient(from calc(var(--border-beam-anchor) - 60deg) at 50% 50%, transparent 0%, var(--border-beam-color-from) 20%, var(--border-beam-color-to) 40%, transparent 50%)`,
          backgroundClip: "border-box",
          animation: `border-beam-spin var(--border-beam-duration) linear infinite`,
          animationDelay: "var(--border-beam-delay)",
        }}
      />
    </div>
  );
}
