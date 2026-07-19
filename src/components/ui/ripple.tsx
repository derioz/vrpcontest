/**
 * MagicUI Ripple — concentric pulsing rings background effect
 * Adapted from https://magicui.design/docs/components/ripple
 */

import React, { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 200,
  mainCircleOpacity = 0.25,
  numCircles = 6,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none overflow-hidden",
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 80;
        const opacity = mainCircleOpacity - i * 0.035;
        const animationDelay = `${i * 0.2}s`;
        const borderStyle = i % 2 === 0 ? "solid" : "dashed";

        return (
          <div
            key={i}
            className={cn(
              "absolute rounded-full border border-fivem-orange/30 bg-fivem-orange/[0.02] shadow-[0_0_20px_rgba(234,88,12,0.1)] animate-ripple",
            )}
            style={
              {
                width: `${size}px`,
                height: `${size}px`,
                opacity: Math.max(opacity, 0.02),
                animationDelay,
                borderStyle,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
});
