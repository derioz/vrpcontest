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

/* ── Single animated digit ── */
function AnimatedDigit({ digit }: { digit: string }) {
  return (
    <div className="relative w-[1.1rem] sm:w-[1.35rem] h-[1.7rem] sm:h-[2.1rem] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: -28, opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: 28, opacity: 0, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="absolute inset-0 flex items-center justify-center text-[1.35rem] sm:text-[1.7rem] font-black font-display tabular-nums text-white leading-none select-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ── Time unit segment ── */
function TimeSegment({ value, label, color }: {
  value: number;
  label: string;
  color: 'orange' | 'amber' | 'sky' | 'emerald';
}) {
  const padded = String(value).padStart(2, '0');

  const colorMap = {
    orange: {
      glow: 'rgba(234,88,12,0.08)',
      border: 'border-orange-500/15 hover:border-orange-500/30',
      label: 'text-orange-400/70',
      topBar: 'bg-gradient-to-r from-transparent via-orange-500/50 to-transparent',
    },
    amber: {
      glow: 'rgba(245,158,11,0.08)',
      border: 'border-amber-500/15 hover:border-amber-500/30',
      label: 'text-amber-400/70',
      topBar: 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent',
    },
    sky: {
      glow: 'rgba(56,189,248,0.08)',
      border: 'border-sky-500/15 hover:border-sky-500/30',
      label: 'text-sky-400/70',
      topBar: 'bg-gradient-to-r from-transparent via-sky-500/50 to-transparent',
    },
    emerald: {
      glow: 'rgba(16,185,129,0.08)',
      border: 'border-emerald-500/15 hover:border-emerald-500/30',
      label: 'text-emerald-400/70',
      topBar: 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent',
    },
  };

  const c = colorMap[color];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'relative flex items-center justify-center gap-[2px] rounded-lg sm:rounded-xl',
          'px-2.5 sm:px-3 py-2 sm:py-2.5',
          'bg-white/[0.025] border transition-all duration-300',
          c.border,
        )}
        style={{ boxShadow: `0 0 24px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` }}
      >
        {/* Top accent bar */}
        <div className={cn('absolute -top-px left-4 right-4 h-px', c.topBar)} />

        {/* Digits */}
        <AnimatedDigit digit={padded[0]} />
        <AnimatedDigit digit={padded[1]} />
      </div>

      <span className={cn('text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-[0.2em]', c.label)}>
        {label}
      </span>
    </div>
  );
}

/* ── Blinking colon ── */
function Colon() {
  return (
    <motion.div
      animate={{ opacity: [0.8, 0.2, 0.8] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 pb-5 sm:pb-6 mx-0.5 sm:mx-1"
    >
      <div className="w-[3px] h-[3px] rounded-full bg-white/50" />
      <div className="w-[3px] h-[3px] rounded-full bg-white/50" />
    </motion.div>
  );
}

/* ── Main Countdown Clock ── */
export function CountdownClock({ targetDate, label, className, onComplete }: CountdownClockProps) {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const diff = target - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      total: diff,
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
    <div className={cn('flex flex-col items-start gap-2.5', className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center gap-2">
          <motion.div
            animate={isExpired ? {} : { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isExpired ? 'bg-red-500' : isUrgent ? 'bg-red-500' : 'bg-emerald-500'
            )}
          />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-white/45">
            {isExpired ? 'Submissions Closed' : label}
          </span>
        </div>
      )}

      {/* Timer */}
      {!isExpired ? (
        <div className="flex items-center">
          <TimeSegment value={timeLeft.days} label="Days" color="orange" />
          <Colon />
          <TimeSegment value={timeLeft.hours} label="Hours" color="amber" />
          <Colon />
          <TimeSegment value={timeLeft.minutes} label="Mins" color="sky" />
          <Colon />
          <TimeSegment value={timeLeft.seconds} label="Secs" color="emerald" />
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
