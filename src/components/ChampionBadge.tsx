import React from 'react';
import { Trophy, Crown, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChampionBadgeProps {
  winCount: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ChampionBadge({
  winCount,
  showLabel = true,
  size = 'sm',
  className
}: ChampionBadgeProps) {
  if (!winCount || winCount <= 0) return null;

  // 1 Win: Gold Champion
  if (winCount === 1) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-display font-bold select-none transition-all shrink-0",
          "bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]",
          size === 'sm' && "px-2 py-0.5 text-[10px]",
          size === 'md' && "px-2.5 py-1 text-xs",
          size === 'lg' && "px-3.5 py-1.5 text-sm",
          className
        )}
        title="1x Contest Winner"
      >
        <Trophy className={cn(
          "text-amber-400 fill-amber-400 shrink-0",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-3.5 h-3.5",
          size === 'lg' && "w-4 h-4"
        )} />
        {showLabel && (
          <span className="tracking-wide">1x Winner</span>
        )}
      </div>
    );
  }

  // 2 Wins: Platinum Double Champion
  if (winCount === 2) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-display font-black select-none transition-all shrink-0",
          "bg-gradient-to-r from-cyan-500/30 via-teal-400/25 to-cyan-500/30 border border-cyan-300/60 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.45)]",
          size === 'sm' && "px-2 py-0.5 text-[10px]",
          size === 'md' && "px-2.5 py-1 text-xs",
          size === 'lg' && "px-3.5 py-1.5 text-sm",
          className
        )}
        title="2x Contest Champion"
      >
        <Crown className={cn(
          "text-cyan-300 fill-cyan-300 animate-pulse shrink-0",
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-3.5 h-3.5",
          size === 'lg' && "w-4 h-4"
        )} />
        {showLabel && (
          <span className="tracking-wide">2x Champion</span>
        )}
      </div>
    );
  }

  // 3+ Wins: Legendary Grand Champion
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-display font-black select-none transition-all shrink-0 relative overflow-hidden",
        "bg-gradient-to-r from-amber-500/35 via-orange-500/30 to-purple-500/35 border border-amber-300/80 text-yellow-200 shadow-[0_0_22px_rgba(245,158,11,0.65)]",
        size === 'sm' && "px-2.5 py-0.5 text-[10px]",
        size === 'md' && "px-3 py-1 text-xs",
        size === 'lg' && "px-4 py-1.5 text-sm",
        className
      )}
      title={`${winCount}x Grand Champion`}
    >
      <Flame className={cn(
        "text-amber-400 fill-orange-500 shrink-0 animate-bounce",
        size === 'sm' && "w-3 h-3",
        size === 'md' && "w-3.5 h-3.5",
        size === 'lg' && "w-4 h-4"
      )} />
      <Trophy className={cn(
        "text-yellow-300 fill-yellow-300 shrink-0",
        size === 'sm' && "w-3 h-3",
        size === 'md' && "w-3.5 h-3.5",
        size === 'lg' && "w-4 h-4"
      )} />
      {showLabel && (
        <span className="tracking-wider text-yellow-100 drop-shadow-sm">
          {winCount}x Legend
        </span>
      )}
    </div>
  );
}
