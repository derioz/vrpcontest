/**
 * MagicUI Animated Shiny Text — sweeping light glare across text
 * Adapted from https://magicui.design/docs/components/animated-shiny-text
 */

import React from "react";
import { cn } from "../../lib/utils";

interface AnimatedShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  shimmerWidth?: number;
  children: React.ReactNode;
}

export function AnimatedShinyText({
  className,
  shimmerWidth = 100,
  children,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      className={cn(
        "inline-flex animate-shiny-text bg-clip-text",
        className
      )}
      style={
        {
          "--shimmer-width": `${shimmerWidth}px`,
          backgroundImage:
            "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)",
          backgroundSize: "var(--shimmer-width) 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "-100% 0",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </span>
  );
}
