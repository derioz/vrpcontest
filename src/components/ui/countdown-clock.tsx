/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface CountdownClockProps {
  targetDate: Date;
  label?: string;
  className?: string;
  onComplete?: () => void;
}

/* ── Individual Flip Digit ── */
function FlipDigit({ value, prevValue }: { value: string; prevValue: string }) {
  const changed = value !== prevValue;

  return (
    <div className="relative w-[1.6rem] sm:w-[2rem] h-[2.2rem] sm:h-[2.8rem] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={changed ? { y: -36, opacity: 0, rotateX: -80 } : false}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: 36, opacity: 0, rotateX: 80 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl font-black font-display tabular-nums text-white"
          style={{ perspective: '200px' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ── Time Unit Card (e.g. "12" Days) ── */
function TimeUnitCard({ value, label, accentColor = 'orange' }: {
  value: number;
  label: string;
  accentColor?: 'orange' | 'amber' | 'blue' | 'emerald';
}) {
  const padded = String(value).padStart(2, '0');
  const prevRef = useRef(padded);
  const prev = prevRef.current;

  useEffect(() => {
    prevRef.current = padded;
  }, [padded]);

  const accentMap = {
    orange: {
      border: 'border-orange-500/20',
      glow: 'shadow-[0_0_20px_rgba(234,88,12,0.15)]',
      dot: 'bg-orange-500',
      text: 'text-orange-400/80',
      topLine: 'from-orange-500/40 via-orange-500/10 to-transparent',
    },
    amber: {
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      dot: 'bg-amber-500',
      text: 'text-amber-400/80',
      topLine: 'from-amber-500/40 via-amber-500/10 to-transparent',
    },
    blue: {
      border: 'border-blue-500/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      dot: 'bg-blue-500',
      text: 'text-blue-400/80',
      topLine: 'from-blue-500/40 via-blue-500/10 to-transparent',
    },
    emerald: {
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      dot: 'bg-emerald-500',
      text: 'text-emerald-400/80',
      topLine: 'from-emerald-500/40 via-emerald-500/10 to-transparent',
    },
  };

  const accent = accentMap[accentColor];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'relative flex items-center justify-center gap-0.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-xl',
          'bg-white/[0.03] backdrop-blur-xl border',
          accent.border,
          accent.glow,
          'transition-shadow duration-500'
        )}
      >
        {/* Top accent line */}
        <div className={cn('absolute top-0 left-3 right-3 h-px bg-gradient-to-r', accent.topLine)} />

        {/* Digit cards */}
        <FlipDigit value={padded[0]} prevValue={prev[0]} />
        <FlipDigit value={padded[1]} prevValue={prev[1]} />

        {/* Subtle inner reflection */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
      </div>

      {/* Label */}
      <span className={cn('text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.18em]', accent.text)}>
        {label}
      </span>
    </div>
  );
}

/* ── Colon Separator ── */
function ColonSeparator() {
  return (
    <div className="flex flex-col items-center gap-1.5 pb-5 sm:pb-6">
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col gap-1"
      >
        <div className="w-1 h-1 rounded-full bg-white/40" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
      </motion.div>
    </div>
  );
}

/* ── Main Countdown Clock ── */
export function CountdownClock({ targetDate, label, className, onComplete }: CountdownClockProps) {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      total: difference,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = calculateTimeLeft();
      setTimeLeft(tl);
      if (tl.total <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onComplete]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.days <= 1;

  return (
    <div className={cn('flex flex-col items-start gap-3', className)}>
      {/* Label row */}
      {label && (
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <motion.div
            animate={isExpired ? {} : { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isExpired ? 'bg-red-500' : isUrgent ? 'bg-red-500' : 'bg-emerald-500'
            )}
          />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-white/50">
            {isExpired ? 'Submissions Closed' : label}
          </span>
        </div>
      )}

      {/* Timer cards */}
      {!isExpired ? (
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <TimeUnitCard value={timeLeft.days} label="Days" accentColor="orange" />
          <ColonSeparator />
          <TimeUnitCard value={timeLeft.hours} label="Hours" accentColor="amber" />
          <ColonSeparator />
          <TimeUnitCard value={timeLeft.minutes} label="Mins" accentColor="blue" />
          <ColonSeparator />
          <TimeUnitCard value={timeLeft.seconds} label="Secs" accentColor="emerald" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-red-400">
            Deadline Passed
          </span>
        </motion.div>
      )}
    </div>
  );
}
