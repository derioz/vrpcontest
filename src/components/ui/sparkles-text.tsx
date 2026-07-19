/**
 * MagicUI Sparkles Text — animated star sparkles around text without layout shifts
 * Adapted from https://magicui.design/docs/components/sparkles-text
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
}

interface SparklesTextProps {
  text: string;
  sparklesCount?: number;
  className?: string;
  colors?: { first: string; second: string };
}

export function SparklesText({
  text,
  sparklesCount = 8,
  className,
  colors = { first: "#ea580c", second: "#fcd34d" },
}: SparklesTextProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generateSparkle = (): Sparkle => ({
      id: Math.random().toString(36).substring(2, 9),
      x: `${Math.random() * 90 + 5}%`,
      y: `${Math.random() * 80 + 10}%`,
      color: Math.random() > 0.5 ? colors.first : colors.second,
      delay: Math.random() * 2,
      scale: Math.random() * 0.7 + 0.5,
      lifespan: Math.random() * 1.5 + 1.5,
    });

    setSparkles(Array.from({ length: sparklesCount }, generateSparkle));
  }, [sparklesCount, colors]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span
        className="relative z-10"
        style={{
          backgroundImage: "linear-gradient(to right, #ea580c, #fb923c, #fcd34d)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {text}
      </span>
      {sparkles.map((sparkle) => (
        <motion.svg
          key={sparkle.id}
          className="pointer-events-none absolute z-20"
          style={{
            top: sparkle.y,
            left: sparkle.x,
            width: `${sparkle.scale * 16}px`,
            height: `${sparkle.scale * 16}px`,
          }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: sparkle.lifespan,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
          viewBox="0 0 160 160"
          fill="none"
        >
          <path
            d="M80 0C80 0 84.2846 41.2925 101.496 58.504 118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496 84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496 41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504 75.7154 41.2925 80 0 80 0Z"
            fill={sparkle.color}
          />
        </motion.svg>
      ))}
    </span>
  );
}
