import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DAMON_AVATAR_URL } from '../../config';
import { cn } from '../../lib/utils';

interface CreatorPillProps {
  className?: string;
}

/**
 * CreatorPill
 * Clean pill-style creator badge with Damon's icon and playful wiggle on click.
 * Fully respects prefers-reduced-motion and guards against rapid-click interruptions.
 */
export function CreatorPill({ className }: CreatorPillProps) {
  const [isWiggling, setIsWiggling] = useState(false);
  const wiggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handlePillClick = () => {
    if (shouldReduceMotion) return;
    if (isWiggling) return; // Prevent spamming / breaking animation

    setIsWiggling(true);
    if (wiggleTimeoutRef.current) clearTimeout(wiggleTimeoutRef.current);
    wiggleTimeoutRef.current = setTimeout(() => {
      setIsWiggling(false);
    }, 420);
  };

  return (
    <motion.button
      type="button"
      onClick={handlePillClick}
      animate={
        isWiggling && !shouldReduceMotion
          ? {
              rotate: [0, -8, 8, -6, 6, -3, 3, 0],
              scale: [1, 1.05, 1.02, 1.05, 1],
            }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
      whileTap={shouldReduceMotion ? { scale: 0.97 } : { scale: 0.94 }}
      className={cn(
        "inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full",
        "border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20",
        "backdrop-blur-md shadow-sm transition-colors duration-200 cursor-pointer select-none group",
        className
      )}
      title="Website Created by Damon"
    >
      <img
        src={DAMON_AVATAR_URL}
        alt="Damon"
        className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 shrink-0 pointer-events-none"
      />
      <span className="text-xs font-mono text-white/50 group-hover:text-white/80 transition-colors">
        Created by <strong className="font-semibold text-white/90 group-hover:text-white">Damon</strong>
      </span>
    </motion.button>
  );
}

export default CreatorPill;
