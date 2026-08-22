/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Calendar, Sparkles } from 'lucide-react';

export interface CountdownClockProps {
  targetDate?: Date | string | number;
  label?: string;
  className?: string;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

// Target: Friday, August 28th, 2026 at 5:59 PM Eastern Time (EDT = UTC-4)
const DEFAULT_TARGET_TIMESTAMP = new Date('2026-08-28T17:59:00-04:00').getTime();

/* ── Web Audio API Mechanical Sound Synthesizer ── */
function playMechanicalSound(type: 'tick' | 'cascade' = 'tick') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } else {
      for (let i = 0; i < 7; i++) {
        const time = ctx.currentTime + i * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + (i % 3) * 30, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.035);
        gain.gain.setValueAtTime(0.035, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.035);
      }
    }
  } catch {
    // AudioContext silently ignored if blocked by browser policy
  }
}

/* ── Single Split-Flap Face Layer ── */
interface FlapFaceProps {
  value: string;
  type: 'top' | 'bottom';
  className?: string;
  children?: React.ReactNode;
}

const FlapFace = React.memo(({ value, type, className, children }: FlapFaceProps) => {
  const isTop = type === 'top';

  return (
    <div
      className={cn(
        'absolute inset-x-0 w-full overflow-hidden select-none',
        isTop ? 'top-0 h-1/2 rounded-t-lg sm:rounded-t-xl' : 'bottom-0 h-1/2 rounded-b-lg sm:rounded-b-xl',
        isTop
          ? 'bg-gradient-to-b from-[#1c1d22] via-[#141518] to-[#0f1013] border-t border-x border-white/[0.12]'
          : 'bg-gradient-to-b from-[#0b0c0e] via-[#111215] to-[#16171a] border-b border-x border-white/[0.08]',
        className
      )}
      style={{
        boxShadow: isTop
          ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -4px 8px rgba(0,0,0,0.5)'
          : 'inset 0 4px 8px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Texture grain */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none opacity-25',
          isTop
            ? 'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_70%)]'
            : 'bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent_60%)]'
        )}
      />

      {/* Number Text Container */}
      <div
        className={cn(
          'absolute inset-x-0 h-[200%] flex items-center justify-center',
          isTop ? 'top-0' : 'bottom-0'
        )}
      >
        <span
          className={cn(
            'font-mono font-black tabular-nums leading-none tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]',
            'text-[1.75rem] xs:text-[2.1rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.6rem]'
          )}
        >
          {value}
        </span>
      </div>

      {children}
    </div>
  );
});

FlapFace.displayName = 'FlapFace';

/* ── Individual Mechanical Flip Unit Card ── */
interface MechanicalFlipCardProps {
  value: number | string;
  label: string;
  colorScheme: 'orange' | 'amber' | 'cyan' | 'emerald';
  isOverdrive?: boolean;
}

const colorThemeMap = {
  orange: {
    accent: '#ea580c',
    glow: 'rgba(234, 88, 12, 0.15)',
    borderHover: 'group-hover:border-orange-500/40',
    labelDot: 'bg-orange-500',
    labelText: 'text-orange-400/80',
    sheen: 'from-orange-500/20 via-amber-500/5 to-transparent',
  },
  amber: {
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
    borderHover: 'group-hover:border-amber-500/40',
    labelDot: 'bg-amber-400',
    labelText: 'text-amber-400/80',
    sheen: 'from-amber-500/20 via-yellow-500/5 to-transparent',
  },
  cyan: {
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.15)',
    borderHover: 'group-hover:border-sky-500/40',
    labelDot: 'bg-sky-400',
    labelText: 'text-sky-400/80',
    sheen: 'from-sky-500/20 via-blue-500/5 to-transparent',
  },
  emerald: {
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    borderHover: 'group-hover:border-emerald-500/40',
    labelDot: 'bg-emerald-400',
    labelText: 'text-emerald-400/80',
    sheen: 'from-emerald-500/20 via-teal-500/5 to-transparent',
  },
};

const MechanicalFlipCard = React.memo(({ value, label, colorScheme, isOverdrive }: MechanicalFlipCardProps) => {
  const formattedValue = typeof value === 'number' ? String(value).padStart(2, '0') : value;
  
  const [currentVal, setCurrentVal] = useState(formattedValue);
  const [previousVal, setPreviousVal] = useState(formattedValue);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipId, setFlipId] = useState(0);

  const theme = colorThemeMap[colorScheme];

  useEffect(() => {
    if (formattedValue !== currentVal) {
      setPreviousVal(currentVal);
      setCurrentVal(formattedValue);
      setIsFlipping(true);
      setFlipId((prev) => prev + 1);

      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [formattedValue, currentVal]);

  return (
    <div className="group flex flex-col items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
      {/* Flip Card Chassis */}
      <div
        className={cn(
          'relative w-full aspect-[1/1.16] max-w-[72px] xs:max-w-[84px] sm:max-w-[104px] md:max-w-[118px] lg:max-w-[128px]',
          'rounded-xl sm:rounded-2xl p-[2px] sm:p-1',
          'bg-gradient-to-b from-[#202128] via-[#131418] to-[#090a0d]',
          'border border-white/10 shadow-[0_12px_28px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.12)]',
          'transition-all duration-300 group-hover:-translate-y-1',
          theme.borderHover,
          isOverdrive && 'ring-2 ring-orange-500/50 shadow-[0_0_24px_rgba(234,88,12,0.35)]'
        )}
        style={{
          boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${theme.glow}`,
        }}
      >
        {/* Corner Rivet Fasteners */}
        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 w-1 h-1 rounded-full bg-zinc-600 border border-zinc-400/40 opacity-70" />
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1 h-1 rounded-full bg-zinc-600 border border-zinc-400/40 opacity-70" />
        <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 w-1 h-1 rounded-full bg-zinc-600 border border-zinc-400/40 opacity-70" />
        <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-1 h-1 rounded-full bg-zinc-600 border border-zinc-400/40 opacity-70" />

        {/* Dynamic Top Sheen */}
        <div className={cn('absolute inset-x-2 -top-px h-px bg-gradient-to-r rounded-full opacity-60', theme.sheen)} />

        {/* 3D Flap Arena */}
        <div
          className="relative w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-black/80"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          {/* Layer 1: Static Top (Shows New Value) */}
          <FlapFace value={currentVal} type="top" />

          {/* Layer 2: Static Bottom (Shows Old Value until covered) */}
          <FlapFace value={previousVal} type="bottom" />

          {/* Layer 3 & 4: Animated Flipping Flaps */}
          {isFlipping && (
            <React.Fragment key={flipId}>
              {/* Front Top Flap (Folds down from 0 to -90 deg) */}
              <FlapFace value={previousVal} type="top" className="animate-flip-top z-20">
                <div className="absolute inset-0 bg-black pointer-events-none animate-flip-shadow" />
              </FlapFace>

              {/* Front Bottom Flap (Unfolds down from 90 to 0 deg) */}
              <FlapFace value={currentVal} type="bottom" className="animate-flip-bottom z-30">
                <div className="absolute inset-0 bg-white/20 pointer-events-none animate-flip-highlight" />
              </FlapFace>
            </React.Fragment>
          )}

          {/* Center Seam Line & Axle Hinges */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1.5px] bg-black/95 shadow-[0_1px_0_rgba(255,255,255,0.06),0_-1px_0_rgba(0,0,0,0.85)] z-40">
            {/* Center axle hinge pin - Left */}
            <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-2.5 rounded-r bg-gradient-to-r from-zinc-800 via-zinc-400 to-zinc-700 shadow-sm border-y border-r border-zinc-950" />
            {/* Center axle hinge pin - Right */}
            <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-2.5 rounded-l bg-gradient-to-l from-zinc-800 via-zinc-400 to-zinc-700 shadow-sm border-y border-l border-zinc-950" />
          </div>
        </div>
      </div>

      {/* Under-Card Minimalist Label */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className={cn('w-1 h-1 rounded-full opacity-80', theme.labelDot)} />
        <span className={cn('text-[9px] xs:text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.2em]', theme.labelText)}>
          {label}
        </span>
      </div>
    </div>
  );
});

MechanicalFlipCard.displayName = 'MechanicalFlipCard';

/* ── Split Separator / Colon Divider ── */
const ClockDivider = React.memo(({ onClick }: { onClick?: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 pb-4 sm:pb-6 px-0.5 sm:px-1 select-none cursor-pointer group"
      title="Click for mechanical pulse"
    >
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/45 group-hover:bg-orange-400 group-hover:shadow-[0_0_8px_rgba(234,88,12,0.8)] transition-all animate-mechanical-tick" />
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/45 group-hover:bg-orange-400 group-hover:shadow-[0_0_8px_rgba(234,88,12,0.8)] transition-all animate-mechanical-tick" />
    </div>
  );
});

ClockDivider.displayName = 'ClockDivider';

/* ── Main Mechanical Split-Flap Countdown Clock Component ── */
export function CountdownClock({
  targetDate = DEFAULT_TARGET_TIMESTAMP,
  label = 'Submissions Close In',
  className,
  onComplete,
}: CountdownClockProps) {
  const targetTimestamp = useMemo(() => {
    if (typeof targetDate === 'number') return targetDate;
    if (typeof targetDate === 'string') return new Date(targetDate).getTime();
    if (targetDate instanceof Date) return targetDate.getTime();
    return DEFAULT_TARGET_TIMESTAMP;
  }, [targetDate]);

  const calculateTimeLeft = useCallback((): TimeLeft => {
    const now = Date.now();
    const diff = Math.max(0, targetTimestamp - now);

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
    };
  }, [targetTimestamp]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);
  const [isCompleted, setIsCompleted] = useState(false);
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [easterEggMessage, setEasterEggMessage] = useState('');
  const [easterEggOverrideVals, setEasterEggOverrideVals] = useState<{
    days: string;
    hours: string;
    mins: string;
    secs: string;
    labels?: { days: string; hours: string; mins: string; secs: string };
  } | null>(null);

  const completedCallbackRef = useRef(false);
  const clockContainerRef = useRef<HTMLDivElement>(null);
  const tiltRafRef = useRef<number | null>(null);

  // Mouse Tilt Parallax State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  /* ── 1-Second Master Wall-Clock Synchronized Loop ── */
  useEffect(() => {
    const updateCountdown = () => {
      const tl = calculateTimeLeft();
      setTimeLeft(tl);

      if (tl.totalMs <= 0 && !completedCallbackRef.current) {
        completedCallbackRef.current = true;
        setIsCompleted(true);
        onComplete?.();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Re-synchronize immediately when visitor tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCountdown();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', updateCountdown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', updateCountdown);
    };
  }, [calculateTimeLeft, onComplete]);

  /* ── Mouse Parallax on Cards (RAF Optimized) ── */
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!clockContainerRef.current) return;

    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);

    const el = clockContainerRef.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    tiltRafRef.current = requestAnimationFrame(() => {
      const tiltX = (py - 0.5) * -5; // Subtle up/down tilt (+/- 2.5deg)
      const tiltY = (px - 0.5) * 5;  // Subtle left/right tilt (+/- 2.5deg)
      setTilt({ x: tiltX, y: tiltY });
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    setTilt({ x: 0, y: 0 });
  }, []);

  /* ── Secret Easter Egg: Split-Flap Time Warp Cascade ── */
  const triggerEasterEgg = useCallback(() => {
    if (easterEggActive) return;
    setEasterEggActive(true);
    playMechanicalSound('cascade');

    const scrambleFrames = [
      { days: '88', hours: '88', mins: '88', secs: '88' },
      { days: '77', hours: '42', mins: '19', secs: '66' },
      { days: '08', hours: '28', mins: '20', secs: '26' }, // Target Date: Aug 28, 2026!
    ];

    let frame = 0;
    const scrambleInterval = setInterval(() => {
      if (frame < scrambleFrames.length) {
        setEasterEggOverrideVals({
          ...scrambleFrames[frame],
          labels: frame === 2 ? { days: 'VITAL', hours: 'PHOTO', mins: 'CONTEST', secs: '2026' } : undefined,
        });
        frame++;
      } else {
        clearInterval(scrambleInterval);
      }
    }, 220);

    setEasterEggMessage('THE CLOCK IS TICKING... SUBMIT YOUR SHOT');

    // Settle back to live countdown after 2.8s
    setTimeout(() => {
      setEasterEggOverrideVals(null);
      setEasterEggActive(false);
      setEasterEggMessage('');
      playMechanicalSound('tick');
    }, 2800);
  }, [easterEggActive]);

  const displayValues = useMemo(() => {
    if (easterEggOverrideVals) {
      return {
        days: easterEggOverrideVals.days,
        hours: easterEggOverrideVals.hours,
        minutes: easterEggOverrideVals.mins,
        seconds: easterEggOverrideVals.secs,
        labels: easterEggOverrideVals.labels || {
          days: 'Days',
          hours: 'Hours',
          mins: 'Minutes',
          secs: 'Seconds',
        },
      };
    }

    return {
      days: timeLeft.days,
      hours: timeLeft.hours,
      minutes: timeLeft.minutes,
      seconds: timeLeft.seconds,
      labels: {
        days: 'Days',
        hours: 'Hours',
        mins: 'Minutes',
        secs: 'Seconds',
      },
    };
  }, [easterEggOverrideVals, timeLeft]);

  return (
    <div
      ref={clockContainerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label="Contest Submission Countdown Clock"
      className={cn(
        'relative w-full flex flex-col items-start gap-3 sm:gap-4 select-none bg-transparent border-none p-0',
        className
      )}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.4, 1)',
      }}
    >
      {/* ── Integrated Event Date Header Row ── */}
      <div
        onClick={triggerEasterEgg}
        className="w-full flex flex-wrap items-center gap-2 sm:gap-3 cursor-pointer group transition-opacity hover:opacity-95"
        title="Interactive Countdown • Click to cycle mechanical cascade"
      >
        {/* Live Status Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                isCompleted ? 'bg-red-400' : 'bg-orange-400'
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2 w-2',
                isCompleted ? 'bg-red-500' : 'bg-orange-500'
              )}
            />
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-black uppercase tracking-[0.18em] text-orange-400">
            {isCompleted ? 'DEADLINE REACHED' : label}
          </span>
        </div>

        <span className="text-white/20 hidden xs:inline">•</span>

        {/* Full Event Date */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-display font-black tracking-wide text-white/90 uppercase">
          <Calendar size={13} className="text-orange-400/90 shrink-0" />
          <span>FRIDAY, AUGUST 28, 2026</span>
          <span className="text-orange-400 font-bold">•</span>
          <span className="text-orange-300 font-mono font-bold">5:59 PM</span>
          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-300 border border-orange-500/25 font-mono font-bold">
            ET
          </span>
        </div>

        {/* Easter Egg Message */}
        <AnimatePresence>
          {easterEggMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-mono font-bold text-orange-400 animate-pulse ml-auto"
            >
              <Sparkles size={11} />
              <span>{easterEggMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mechanical Flip Clock Display Units ── */}
      <div className="w-full flex items-center justify-between gap-1 xs:gap-2 sm:gap-3">
        {/* Days */}
        <MechanicalFlipCard
          value={displayValues.days}
          label={displayValues.labels.days}
          colorScheme="orange"
          isOverdrive={easterEggActive}
        />

        <ClockDivider onClick={triggerEasterEgg} />

        {/* Hours */}
        <MechanicalFlipCard
          value={displayValues.hours}
          label={displayValues.labels.hours}
          colorScheme="amber"
          isOverdrive={easterEggActive}
        />

        <ClockDivider onClick={triggerEasterEgg} />

        {/* Minutes */}
        <MechanicalFlipCard
          value={displayValues.minutes}
          label={displayValues.labels.mins}
          colorScheme="cyan"
          isOverdrive={easterEggActive}
        />

        <ClockDivider onClick={triggerEasterEgg} />

        {/* Seconds */}
        <MechanicalFlipCard
          value={displayValues.seconds}
          label={displayValues.labels.secs}
          colorScheme="emerald"
          isOverdrive={easterEggActive}
        />
      </div>

      {/* Completed Subtle Notice */}
      {isCompleted && (
        <div className="w-full pt-1 flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
          <span>⚠️ Official deadline has arrived. Submissions closed. Community voting underway.</span>
        </div>
      )}
    </div>
  );
}
