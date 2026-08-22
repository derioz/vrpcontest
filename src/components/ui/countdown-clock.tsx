/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Clock, Calendar, Sparkles, Trophy, Zap, Info } from 'lucide-react';

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

/* ── Web Audio API Mechanical Sound Synthesizer (Zero Dependencies) ── */
function playMechanicalFlipSound(type: 'single' | 'cascade' = 'single') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'single') {
      // Subtle mechanical relay click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else {
      // Cascade rapid clatter
      for (let i = 0; i < 8; i++) {
        const time = ctx.currentTime + i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + (i % 3) * 40, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.035);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.035);
      }
    }
  } catch {
    // AudioContext blocked or not allowed — silently ignore
  }
}

/* ── Single Split-Flap Digit Half View ── */
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
          ? 'bg-gradient-to-b from-[#1c1d22] via-[#15161a] to-[#101114] border-t border-x border-white/[0.12]'
          : 'bg-gradient-to-b from-[#0c0d10] via-[#121316] to-[#17181d] border-b border-x border-white/[0.08]',
        className
      )}
      style={{
        boxShadow: isTop
          ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -4px 8px rgba(0,0,0,0.5)'
          : 'inset 0 4px 8px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Subtle textured paper / card grain overlay */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none opacity-30',
          isTop
            ? 'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_70%)]'
            : 'bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent_60%)]'
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
            'font-mono font-black tabular-nums leading-none tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
            'text-[1.85rem] xs:text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4rem]'
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
    glow: 'rgba(234, 88, 12, 0.25)',
    border: 'border-orange-500/30 group-hover:border-orange-500/60',
    labelBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    indicator: 'bg-orange-500',
    topSheen: 'from-orange-500/30 via-amber-500/10 to-transparent',
  },
  amber: {
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    border: 'border-amber-500/30 group-hover:border-amber-500/60',
    labelBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    indicator: 'bg-amber-400',
    topSheen: 'from-amber-500/30 via-yellow-500/10 to-transparent',
  },
  cyan: {
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.25)',
    border: 'border-sky-500/30 group-hover:border-sky-500/60',
    labelBg: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    indicator: 'bg-sky-400',
    topSheen: 'from-sky-500/30 via-blue-500/10 to-transparent',
  },
  emerald: {
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
    border: 'border-emerald-500/30 group-hover:border-emerald-500/60',
    labelBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    indicator: 'bg-emerald-400',
    topSheen: 'from-emerald-500/30 via-teal-500/10 to-transparent',
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
    <div className="group flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0">
      {/* Outer Mechanical Bezel & Housing */}
      <div
        className={cn(
          'relative w-full aspect-[1/1.18] max-w-[80px] xs:max-w-[94px] sm:max-w-[114px] md:max-w-[128px] lg:max-w-[140px]',
          'rounded-xl sm:rounded-2xl p-[3px] sm:p-1.5',
          'bg-gradient-to-b from-[#24262e] via-[#15161b] to-[#0a0b0e]',
          'border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)]',
          'transition-all duration-300 group-hover:-translate-y-1',
          isOverdrive && 'ring-2 ring-orange-500/50 shadow-[0_0_30px_rgba(234,88,12,0.4)]'
        )}
        style={{
          boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 20px ${theme.glow}`,
        }}
      >
        {/* Chassis Corner Rivets / Fasteners */}
        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-600 border border-zinc-400/40 shadow-inner" />
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-600 border border-zinc-400/40 shadow-inner" />
        <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-600 border border-zinc-400/40 shadow-inner" />
        <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-600 border border-zinc-400/40 shadow-inner" />

        {/* Dynamic Specular Top Accent Sheen */}
        <div className={cn('absolute inset-x-3 -top-px h-[2px] bg-gradient-to-r rounded-full opacity-70', theme.topSheen)} />

        {/* 3D Perspective Card Arena */}
        <div
          className="relative w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-black/80"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          {/* Layer 1: Static Top (Shows New Value) */}
          <FlapFace value={currentVal} type="top" />

          {/* Layer 2: Static Bottom (Shows Old Value until covered) */}
          <FlapFace value={previousVal} type="bottom" />

          {/* Layer 3 & 4: Animated Flipping Flaps (Active during transition) */}
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

          {/* Mechanical Split Seam Line & Central Axis Rivets */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1.5px] sm:h-[2px] bg-black/95 shadow-[0_1px_0_rgba(255,255,255,0.08),0_-1px_0_rgba(0,0,0,0.9)] z-40">
            {/* Center axle hinge pin - Left */}
            <div className="absolute left-[-2px] sm:left-[-3px] top-1/2 -translate-y-1/2 w-1.5 sm:w-2 h-3 sm:h-3.5 rounded-r bg-gradient-to-r from-zinc-800 via-zinc-400 to-zinc-700 shadow-md border-y border-r border-zinc-950" />
            {/* Center axle hinge pin - Right */}
            <div className="absolute right-[-2px] sm:right-[-3px] top-1/2 -translate-y-1/2 w-1.5 sm:w-2 h-3 sm:h-3.5 rounded-l bg-gradient-to-l from-zinc-800 via-zinc-400 to-zinc-700 shadow-md border-y border-l border-zinc-950" />
          </div>
        </div>
      </div>

      {/* Unit Sub-Label Badge */}
      <div
        className={cn(
          'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg border backdrop-blur-sm',
          'transition-all duration-300',
          theme.labelBg
        )}
      >
        <div className={cn('w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse', theme.indicator)} />
        <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
    </div>
  );
});

MechanicalFlipCard.displayName = 'MechanicalFlipCard';

/* ── Split Separator / Colon Divider ── */
const ClockDivider = React.memo(() => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:gap-3.5 pb-6 sm:pb-8 px-0.5 sm:px-1 select-none">
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-mechanical-tick" />
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-mechanical-tick" />
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
  const [tilt, setTilt] = useState({ x: 0, y: 0, mouseX: '50%', mouseY: '50%' });

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

  /* ── Mouse Parallax & Dynamic Light Reflector (RAF Optimized) ── */
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!clockContainerRef.current) return;

    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);

    const el = clockContainerRef.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    tiltRafRef.current = requestAnimationFrame(() => {
      const tiltX = (py - 0.5) * -8; // Up/down tilt (+/- 4deg)
      const tiltY = (px - 0.5) * 8;  // Left/right tilt (+/- 4deg)
      setTilt({
        x: tiltX,
        y: tiltY,
        mouseX: `${(px * 100).toFixed(1)}%`,
        mouseY: `${(py * 100).toFixed(1)}%`,
      });
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    setTilt({ x: 0, y: 0, mouseX: '50%', mouseY: '50%' });
  }, []);

  /* ── Secret Easter Egg: Split-Flap Time Warp Cascade ── */
  const triggerEasterEgg = useCallback(() => {
    if (easterEggActive) return;
    setEasterEggActive(true);
    playMechanicalFlipSound('cascade');

    // Sequence 1: Matrix cyber cascade scramble
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

    setEasterEggMessage('⚡ OVERDRIVE FLIP CASCADE • TARGET: AUG 28 • LOS SANTOS LEGEND');

    // Settle back to live countdown after 3.2s
    setTimeout(() => {
      setEasterEggOverrideVals(null);
      setEasterEggActive(false);
      setEasterEggMessage('');
      playMechanicalFlipSound('single');
    }, 3200);
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
      className={cn(
        'relative w-full max-w-2xl mx-auto flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-7 rounded-2xl sm:rounded-3xl',
        'bg-gradient-to-b from-[#16171d]/90 via-[#0e0f13]/95 to-[#08090b]/98',
        'border border-white/10 backdrop-blur-xl',
        'shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12)]',
        'transition-transform duration-200 ease-out select-none',
        className
      )}
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      }}
    >
      {/* Dynamic Specular Light Glare moving across the clock frame */}
      <div
        className="absolute inset-0 rounded-2xl sm:rounded-3xl pointer-events-none transition-opacity duration-300 opacity-60"
        style={{
          background: `radial-gradient(600px circle at ${tilt.mouseX} ${tilt.mouseY}, rgba(255,255,255,0.06), transparent 70%)`,
        }}
      />

      {/* ── Top Plaque: Full Event Date & Official Status ── */}
      <div
        onClick={triggerEasterEgg}
        title="Click to trigger mechanical diagnostic cascade"
        className="relative group cursor-pointer w-full flex flex-col items-center gap-2"
      >
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl',
            'bg-white/[0.03] border border-white/10 hover:border-orange-500/40',
            'shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]',
            'transition-all duration-300 hover:scale-[1.01]',
            easterEggActive && 'border-orange-500/60 shadow-[0_0_24px_rgba(234,88,12,0.35)]'
          )}
        >
          {/* Status Dot / Ping */}
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
            <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-[0.18em] text-orange-400">
              {isCompleted ? 'DEADLINE REACHED' : label}
            </span>
          </div>

          <div className="h-3 w-px bg-white/20 hidden xs:block" />

          {/* Full Integrated Event Date */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-display font-black tracking-wide text-white uppercase drop-shadow-sm">
            <Calendar size={13} className="text-orange-400/90 shrink-0" />
            <span>FRIDAY, AUGUST 28, 2026</span>
            <span className="text-orange-400 font-bold">•</span>
            <span className="text-orange-300 font-mono font-bold">5:59 PM</span>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-mono font-bold">
              ET
            </span>
          </div>

          <Zap size={12} className="text-white/30 group-hover:text-orange-400 transition-colors hidden sm:block" />
        </div>

        {/* Easter Egg Dynamic Message Bar */}
        <AnimatePresence>
          {easterEggMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] sm:text-xs font-mono font-bold tracking-wider animate-pulse"
            >
              <Sparkles size={12} className="text-orange-400" />
              <span>{easterEggMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mechanical Flip Clock Display Arena ── */}
      {!isCompleted ? (
        <div className="w-full flex items-center justify-between gap-1 xs:gap-2 sm:gap-3 px-1 sm:px-2">
          {/* Days */}
          <MechanicalFlipCard
            value={displayValues.days}
            label={displayValues.labels.days}
            colorScheme="orange"
            isOverdrive={easterEggActive}
          />

          <ClockDivider />

          {/* Hours */}
          <MechanicalFlipCard
            value={displayValues.hours}
            label={displayValues.labels.hours}
            colorScheme="amber"
            isOverdrive={easterEggActive}
          />

          <ClockDivider />

          {/* Minutes */}
          <MechanicalFlipCard
            value={displayValues.minutes}
            label={displayValues.labels.mins}
            colorScheme="cyan"
            isOverdrive={easterEggActive}
          />

          <ClockDivider />

          {/* Seconds */}
          <MechanicalFlipCard
            value={displayValues.seconds}
            label={displayValues.labels.secs}
            colorScheme="emerald"
            isOverdrive={easterEggActive}
          />
        </div>
      ) : (
        /* ── Completion Showcase Sequence ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex flex-col items-center gap-4 py-6 px-4 rounded-2xl bg-gradient-to-b from-amber-500/10 via-zinc-900 to-black border border-amber-500/30 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
            <Trophy size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black font-display text-white uppercase tracking-wide">
              Submissions Closed • Judging Underway
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
              The submission window has officially closed. Community voting and final judging are currently active. Thank you to all participants!
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold tracking-widest text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30">
            <Clock size={12} />
            Final Lock: August 28, 2026 • 5:59 PM EDT
          </div>
        </motion.div>
      )}

      {/* ── Subtitle / Footer Plaque ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] sm:text-xs font-mono text-zinc-400/80">
        <div className="flex items-center gap-1.5">
          <Info size={11} className="text-orange-400/70 shrink-0" />
          <span>Locked to America/New_York (EDT) Timezone</span>
        </div>
        <div className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
          <span>Mechanical Split-Flap System</span>
        </div>
      </div>
    </div>
  );
}
