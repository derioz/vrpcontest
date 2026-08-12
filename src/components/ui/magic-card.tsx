import React, { useCallback } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "../../lib/utils";

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
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
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
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
