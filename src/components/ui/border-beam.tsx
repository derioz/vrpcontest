/**
 * MagicUI Border Beam — animated glowing beam traveling strictly along the card border outline
 * Adapted from https://magicui.design/docs/components/border-beam
 */

import React from "react";
import { cn } from "../../lib/utils";

interface BorderBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 8,
  borderWidth = 2,
  colorFrom = "#ea580c",
  colorTo = "#fb923c",
  delay = 0,
  ...props
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] z-30 overflow-hidden",
        className
      )}
      style={{
        padding: `${borderWidth}px`,
        mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        maskComposite: `exclude`,
        WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMaskComposite: `destination-out`,
      }}
      {...props}
    >
      <div
        className="absolute inset-[-100%] animate-border-beam"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 280deg, ${colorFrom} 330deg, ${colorTo} 360deg)`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}
