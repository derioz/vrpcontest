/**
 * MagicUI Word Rotate — animated word flipper using framer-motion AnimatePresence
 * Adapted from https://magicui.design/docs/components/word-rotate
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/utils";

interface WordRotateProps {
  words: string[];
  duration?: number;
  framerProps?: HTMLMotionProps<"span">;
  className?: string;
}

export function WordRotate({
  words,
  duration = 2500,
  framerProps = {
    initial: { opacity: 0, y: -15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 15 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
}: WordRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span className="inline-block overflow-hidden py-0.5 align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          className={cn(className)}
          {...framerProps}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
