/**
 * MagicUI Scroll Based Velocity
 * Documentation & Reference: https://magicui.design/docs/components/scroll-based-velocity
 *
 * Smooth scroll-linked kinetic typography that dynamically accelerates and reverses
 * direction based on user scrolling speed.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { cn } from "../../lib/utils";

export interface VelocityScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultVelocity?: number;
  className?: string;
  numRows?: number;
  text?: string;
  children?: React.ReactNode;
  damping?: number;
  stiffness?: number;
}

export const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

interface ParallaxProps {
  key?: React.Key;
  children: React.ReactNode;
  baseVelocity: number;
  className?: string;
  damping?: number;
  stiffness?: number;
}

function ParallaxText({
  children,
  baseVelocity = 100,
  className,
  damping = 50,
  stiffness = 400,
  ...props
}: ParallaxProps) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping,
    stiffness,
  });

  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const [repetitions, setRepetitions] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const calculateRepetitions = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth || 1;
        const newRepetitions = Math.ceil(containerWidth / textWidth) + 2;
        setRepetitions(Math.max(newRepetitions, 3));
      }
    };

    calculateRepetitions();
    window.addEventListener("resize", calculateRepetitions);
    return () => window.removeEventListener("resize", calculateRepetitions);
  }, [children]);

  const x = useTransform(baseX, (v) => `${wrap(0, -100 / repetitions, v)}%`);

  const directionFactor = useRef<number>(1);
  useAnimationFrame((_t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden whitespace-nowrap flex flex-nowrap"
      {...props}
    >
      <motion.div
        className={cn("inline-flex whitespace-nowrap flex-nowrap will-change-transform", className)}
        style={{ x }}
      >
        {Array.from({ length: repetitions }).map((_, i) => (
          <span key={i} ref={i === 0 ? textRef : null} className="inline-block px-4">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function VelocityScroll({
  defaultVelocity = 3,
  numRows = 2,
  children,
  text,
  className,
  damping = 50,
  stiffness = 400,
  ...props
}: VelocityScrollProps) {
  const content = text || children;

  return (
    <div
      className={cn(
        "relative w-full space-y-2 select-none overflow-hidden",
        className
      )}
      {...props}
    >
      {Array.from({ length: numRows }).map((_, i) => (
        <ParallaxText
          key={i}
          baseVelocity={defaultVelocity * (i % 2 === 0 ? 1 : -1)}
          className={className}
          damping={damping}
          stiffness={stiffness}
        >
          {content}
        </ParallaxText>
      ))}
    </div>
  );
}

export default VelocityScroll;
