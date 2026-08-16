import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'gradient';
  striped?: boolean;
  animated?: boolean;
  className?: string;
  barClassName?: string;
  glow?: boolean;
}

const sizeClasses = {
  xs: 'h-1.5',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const variantClasses = {
  default: 'bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  amber: 'bg-gradient-to-r from-amber-500 to-yellow-400',
  rose: 'bg-gradient-to-r from-rose-500 to-pink-500',
  indigo: 'bg-gradient-to-r from-indigo-500 to-purple-500',
  gradient: 'bg-gradient-to-r from-fivem-orange via-amber-400 to-orange-600',
};

const glowClasses = {
  default: 'shadow-[0_0_12px_rgba(234,88,12,0.6)]',
  emerald: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
  amber: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
  rose: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]',
  indigo: 'shadow-[0_0_12px_rgba(99,102,241,0.6)]',
  gradient: 'shadow-[0_0_14px_rgba(234,88,12,0.7)]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  size = 'sm',
  variant = 'default',
  striped = false,
  animated = true,
  className,
  barClassName,
  glow = true,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100))) || 0;

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-mono">
          {label && <span className="text-white/70 font-medium truncate">{label}</span>}
          {showValue && (
            <span className="text-white/90 font-bold ml-auto pl-2">
              {percentage}%
            </span>
          )}
        </div>
      )}

      {/* Progress Track (SeraUI Track) */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-white/[0.08] border border-white/5 p-[1px]',
          sizeClasses[size]
        )}
      >
        {/* Animated Fill Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 0.75 : 0, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'relative h-full rounded-full transition-all',
            variantClasses[variant],
            glow && glowClasses[variant],
            striped && 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] animate-[progress-bar-stripes_1s_linear_infinite]',
            barClassName
          )}
        >
          {/* Subtle Glint / Gloss Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/20 rounded-full" />
        </motion.div>
      </div>
    </div>
  );
};
