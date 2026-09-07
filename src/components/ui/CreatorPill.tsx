import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DAMON_AVATAR_URL } from '../../config';
import { cn } from '../../lib/utils';

interface CreatorPillProps {
  className?: string;
}

/**
 * CreatorPill
 * Clean pill-style creator badge with Damon's icon, reserved dimensions,
 * refined wiggle on click, and optional subtle Easter egg.
 * Fully respects prefers-reduced-motion and prevents layout shifts.
 */
export function CreatorPill({ className }: CreatorPillProps) {
  const [isWiggling, setIsWiggling] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const wiggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const easterEggTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const handlePillClick = () => {
    if (shouldReduceMotion) return;

    // Trigger wiggle animation safely
    setIsWiggling(false);
    requestAnimationFrame(() => {
      setIsWiggling(true);
      if (wiggleTimeoutRef.current) clearTimeout(wiggleTimeoutRef.current);
      wiggleTimeoutRef.current = setTimeout(() => {
        setIsWiggling(false);
      }, 380);
    });

    // Tasteful Easter Egg: temporarily display mini WOMP WOMP indicator
    setShowEasterEgg(true);
    if (easterEggTimeoutRef.current) clearTimeout(easterEggTimeoutRef.current);
    easterEggTimeoutRef.current = setTimeout(() => {
      setShowEasterEgg(false);
    }, 1100);
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Optional Tasteful Damon Easter Egg Banner (Zero layout shift) */}
      <AnimatePresence>
        {showEasterEgg && !shouldReduceMotion && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: -26, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.85 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-fivem-orange to-amber-500 text-black font-black text-[9px] font-mono tracking-widest uppercase pointer-events-none shadow-[0_4px_12px_rgba(234,88,12,0.4)] whitespace-nowrap z-50 select-none"
          >
            WOMP WOMP
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handlePillClick}
        animate={
          isWiggling && !shouldReduceMotion
            ? {
                rotate: [0, -10, 10, -7, 7, -3, 3, 0],
                scale: [1, 1.04, 1.02, 1.04, 1],
              }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
        whileTap={shouldReduceMotion ? { scale: 0.97 } : { scale: 0.95 }}
        className={cn(
          "inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full",
          "border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20",
          "backdrop-blur-md shadow-sm transition-colors duration-200 cursor-pointer select-none group relative",
          className
        )}
        title="Built by Damon"
      >
        <img
          src={DAMON_AVATAR_URL}
          alt="Damon"
          width={20}
          height={20}
          loading="lazy"
          className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 shrink-0 pointer-events-none"
        />
        <span className="text-xs font-mono text-white/50 group-hover:text-white/80 transition-colors">
          Created by <strong className="font-semibold text-white/90 group-hover:text-white">Damon</strong>
        </span>
      </motion.button>
    </div>
  );
}

export default CreatorPill;
