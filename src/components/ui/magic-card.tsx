/**
 * MagicUI Magic Card — interactive spotlight glow card that tracks cursor movement with optional BorderBeam
 * Adapted from https://magicui.design/docs/components/magic-card
 */

import React, { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "../../lib/utils";
import { BorderBeam } from "./border-beam";

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientSize?: number;
  gradientColor?: string;
  active?: boolean;
  borderBeamProps?: {
    size?: number;
    duration?: number;
    borderWidth?: number;
    colorFrom?: string;
    colorTo?: string;
    delay?: number;
  };
  children?: React.ReactNode;
}

export function MagicCard({
  children,
  className,
  gradientSize = 250,
  gradientColor = "rgba(234, 88, 12, 0.18)",
  active = false,
  borderBeamProps,
  ...props
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [mouseX, mouseY, gradientSize]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-fivem-card",
        className
      )}
      {...props}
    >
      {/* Outer Border Beam on the exact outer card boundary */}
      {active && (
        <BorderBeam
          size={borderBeamProps?.size ?? 250}
          duration={borderBeamProps?.duration ?? 6}
          colorFrom={borderBeamProps?.colorFrom ?? "#ea580c"}
          colorTo={borderBeamProps?.colorTo ?? "#fcd34d"}
          borderWidth={borderBeamProps?.borderWidth ?? 2}
        />
      )}

      {/* Spotlight glow tracking layer */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${gradientSize}px circle at ${mouseX}px ${mouseY}px,
              ${gradientColor},
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-0 h-full w-full">{children}</div>
    </div>
  );
}
