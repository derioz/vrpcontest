/**
 * Aceternity-inspired FlipWords — cycles through words with a flip animation
 * Uses AnimatePresence with blur + vertical slide transitions.
 * Auto-rotates on a configurable interval.
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

interface FlipWordsProps {
  words: string[];
  duration?: number;
  className?: string;
}

export function FlipWords({
  words,
  duration = 3000,
  className,
}: FlipWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextWord = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % words.length);
  }, [words.length]);

  useEffect(() => {
    const interval = setInterval(nextWord, duration);
    return () => clearInterval(interval);
  }, [nextWord, duration]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[currentIndex]}
        initial={{
          opacity: 0,
          y: 10,
          filter: "blur(8px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        exit={{
          opacity: 0,
          y: -15,
          filter: "blur(6px)",
        }}
        transition={{
          duration: 0.35,
          ease: "easeInOut",
        }}
        className={cn(
          "inline-block",
          className
        )}
      >
        {words[currentIndex]}
      </motion.span>
    </AnimatePresence>
  );
}
