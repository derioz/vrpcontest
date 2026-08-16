import React from 'react';
import { cn } from '../lib/utils';

// ==========================================
// 1. High-Precision Vector SVG Heraldry Icons
// ==========================================

export const GoldChampionIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10" fill="url(#goldChampBg)" fillOpacity="0.2" />
    <circle cx="12" cy="12" r="10" stroke="url(#goldChampGrad)" strokeWidth="1.2" fill="none" />
    <path
      d="M8 7h8v4a4 4 0 0 1-8 0V7z"
      fill="url(#goldChampGrad)"
      fillOpacity="0.35"
      stroke="url(#goldChampGrad)"
      strokeWidth="1.2"
    />
    <path
      d="M8 8H5.5a1.5 1.5 0 0 0 1.5 2.5H8M16 8h2.5a1.5 1.5 0 0 1-1.5 2.5H16"
      stroke="url(#goldChampGrad)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M12 15v3m-2.5 0h5"
      stroke="url(#goldChampGrad)"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="m10.5 10 1 1 2-2"
      stroke="#FFF"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="goldChampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <radialGradient id="goldChampBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
      </radialGradient>
    </defs>
  </svg>
);

export const PlatinumChampionIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10" fill="url(#platChampBg)" fillOpacity="0.2" />
    <circle cx="12" cy="12" r="10" stroke="url(#platChampGrad)" strokeWidth="1.2" fill="none" />
    <path
      d="M6 15.5h12l-1-6.5-3.5 3L12 6.5l-1.5 5.5-3.5-3-1 6.5z"
      fill="url(#platChampGrad)"
      fillOpacity="0.35"
      stroke="url(#platChampGrad)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="6.5" r="1" fill="#E0F2FE" />
    <circle cx="7" cy="9" r="0.75" fill="#E0F2FE" />
    <circle cx="17" cy="9" r="0.75" fill="#E0F2FE" />
    <defs>
      <linearGradient id="platChampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="40%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
      <radialGradient id="platChampBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#0369A1" stopOpacity="0.1" />
      </radialGradient>
    </defs>
  </svg>
);

export const GrandChampionIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10" fill="url(#grandChampBg)" fillOpacity="0.2" />
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="url(#grandChampGrad)"
      strokeWidth="1.2"
      strokeDasharray="2 2"
      className="animate-spin"
      style={{ animationDuration: '10s' }}
      fill="none"
    />
    <path
      d="M12 4.5l1.8 4.2 4.5.4-3.4 3 1 4.4L12 14.2l-3.9 2.3 1-4.4-3.4-3 4.5-.4L12 4.5z"
      fill="url(#grandChampGrad)"
      fillOpacity="0.35"
      stroke="url(#grandChampGrad)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11.5" r="1.3" fill="#DDD6FE" />
    <defs>
      <linearGradient id="grandChampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5D0FE" />
        <stop offset="35%" stopColor="#C084FC" />
        <stop offset="70%" stopColor="#818CF8" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <radialGradient id="grandChampBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.1" />
      </radialGradient>
    </defs>
  </svg>
);

export const MythicLegendIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10.5" fill="url(#mythicChampBg)" fillOpacity="0.25" />
    <circle
      cx="12"
      cy="12"
      r="10.5"
      stroke="url(#mythicChampGrad)"
      strokeWidth="1.3"
      strokeDasharray="3 2"
      className="animate-spin"
      style={{ animationDuration: '8s' }}
      fill="none"
    />
    <path
      d="M12 3.5c-1.5 2.5-4 4.5-4 7.5 0 3.3 2.7 5.5 6 5.5s6-2.2 6-5.5c0-3-2.5-5-4-7.5-1 2-2 2.8-4 0z"
      fill="url(#mythicChampGrad)"
      fillOpacity="0.4"
      stroke="url(#mythicChampGrad)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M12 9.5c-.8 1.2-1.8 2-1.8 3.5 0 1.5 1 2.5 2.3 2.5s2.3-1 2.3-2.5c0-1.5-1-2.3-1.8-3.5-.4 1-.7 1.3-1 0z"
      fill="#FEF08A"
      fillOpacity="0.85"
    />
    <defs>
      <linearGradient id="mythicChampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="30%" stopColor="#F43F5E" />
        <stop offset="65%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      <radialGradient id="mythicChampBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
      </radialGradient>
    </defs>
  </svg>
);

// ==========================================
// 2. Component Interface & Sizes
// ==========================================

export interface ChampionBadgeProps {
  winCount: number;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  interactive?: boolean;
}

const sizeStyles = {
  xs: {
    container: 'px-1.5 py-0.5 text-[9px] gap-1',
    icon: 'w-3 h-3',
    numText: 'text-[9px]',
  },
  sm: {
    container: 'px-2 py-0.5 text-[10px] gap-1.2',
    icon: 'w-3.5 h-3.5',
    numText: 'text-[10px]',
  },
  md: {
    container: 'px-2.5 py-1 text-xs gap-1.5',
    icon: 'w-4 h-4',
    numText: 'text-xs',
  },
  lg: {
    container: 'px-3.5 py-1.5 text-sm gap-2',
    icon: 'w-5 h-5',
    numText: 'text-sm',
  },
};

export function ChampionBadge({
  winCount,
  showLabel = true,
  size = 'sm',
  className,
  interactive = false,
}: ChampionBadgeProps) {
  if (!winCount || winCount <= 0) return null;

  const sz = sizeStyles[size];

  // Tier 1: 1 Win (Gold Honor Champion)
  if (winCount === 1) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-display font-bold select-none transition-all duration-200 shrink-0',
          'bg-[#121008]/90 hover:bg-amber-950/40 border border-amber-400/35 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.18)] backdrop-blur-md',
          interactive && 'hover:scale-[1.04] active:scale-95 cursor-pointer',
          sz.container,
          className
        )}
        title="1st Place Winner (1 Contest Round Victory)"
      >
        <GoldChampionIcon className={sz.icon} />
        {showLabel ? (
          <span className="tracking-wide">1x Winner</span>
        ) : (
          <span className={cn('font-mono font-bold text-amber-300', sz.numText)}>1</span>
        )}
      </div>
    );
  }

  // Tier 2: 2 Wins (Platinum Double Champion)
  if (winCount === 2) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-display font-extrabold select-none transition-all duration-200 shrink-0',
          'bg-[#081216]/90 hover:bg-cyan-950/40 border border-cyan-400/35 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.2)] backdrop-blur-md',
          interactive && 'hover:scale-[1.04] active:scale-95 cursor-pointer',
          sz.container,
          className
        )}
        title="2x Contest Champion (2 Round Victories)"
      >
        <PlatinumChampionIcon className={sz.icon} />
        {showLabel ? (
          <span className="tracking-wide">2x Champion</span>
        ) : (
          <span className={cn('font-mono font-bold text-cyan-200', sz.numText)}>2x</span>
        )}
      </div>
    );
  }

  // Tier 3: 3-4 Wins (Royal Amethyst Grand Champion)
  if (winCount < 5) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-display font-black select-none transition-all duration-200 shrink-0',
          'bg-[#120818]/90 hover:bg-violet-950/40 border border-violet-400/40 text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.25)] backdrop-blur-md',
          interactive && 'hover:scale-[1.04] active:scale-95 cursor-pointer',
          sz.container,
          className
        )}
        title={`${winCount}x Grand Champion (${winCount} Round Victories)`}
      >
        <GrandChampionIcon className={sz.icon} />
        {showLabel ? (
          <span className="tracking-wide">{winCount}x Grand Champion</span>
        ) : (
          <span className={cn('font-mono font-bold text-violet-200', sz.numText)}>{winCount}x</span>
        )}
      </div>
    );
  }

  // Tier 4: 5+ Wins (Mythic Starlight Legend)
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-display font-black select-none transition-all duration-200 shrink-0',
        'bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 border border-amber-300/50 text-amber-100 shadow-[0_0_18px_rgba(245,158,11,0.35)] backdrop-blur-md',
        interactive && 'hover:scale-[1.04] active:scale-95 cursor-pointer',
        sz.container,
        className
      )}
      title={`${winCount}x Mythic Legend (Hall of Fame Multi-Winner)`}
    >
      <MythicLegendIcon className={sz.icon} />
      {showLabel ? (
        <span className="tracking-wider text-yellow-100 drop-shadow-sm">{winCount}x Legend</span>
      ) : (
        <span className={cn('font-mono font-bold text-yellow-200', sz.numText)}>{winCount}x</span>
      )}
    </div>
  );
}
