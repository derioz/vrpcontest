/**
 * MagicUI Meteors — animated shooting star streaks
 * Adapted from https://magicui.design/docs/components/meteors
 */

import React from "react";
import { cn } from "../../lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 20, className }: MeteorsProps) {
  const meteors = Array.from({ length: number }, (_, idx) => idx);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {meteors.map((idx) => {
        const meteorStyle: React.CSSProperties = {
          top: `${Math.random() * 50 - 10}%`,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${Math.random() * 3 + 2}s`,
        };

        return (
          <span
            key={`meteor-${idx}`}
            className="animate-meteor absolute h-0.5 w-0.5 rotate-[215deg] rounded-full bg-fivem-orange/80 shadow-[0_0_0_1px_rgba(234,88,12,0.05)]"
            style={meteorStyle}
          >
            {/* Tail */}
            <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2 bg-gradient-to-r from-fivem-orange/60 to-transparent" />
          </span>
        );
      })}
    </div>
  );
}
