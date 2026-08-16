import React from 'react';
import { Trophy, Crown, Flame, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

export interface ChampionBadgeProps {
  winCount: number;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  interactive?: boolean;
}

export function ChampionBadge({
  winCount,
  showLabel = true,
  size = 'sm',
  className,
  interactive = false,
}: ChampionBadgeProps) {
  if (!winCount || winCount <= 0) return null;

  // Icon sizing helper
  const iconSizeClass = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  // 1 Win: Gold Honor Champion
  if (winCount === 1) {
    return (
      <Badge
        variant="gold"
        size={size}
        interactive={interactive}
        className={cn(
          'font-display shrink-0 font-bold tracking-wide select-none group/badge',
          className
        )}
        title="1st Place Winner (1 Contest Round Victory)"
        iconLeft={
          <Trophy
            className={cn(
              'text-amber-400 fill-amber-400/80 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)] transition-transform duration-200 group-hover/badge:scale-110',
              iconSizeClass
            )}
          />
        }
      >
        {showLabel ? (
          <span>1x Winner</span>
        ) : (
          <span className="font-mono text-[9px] font-bold text-amber-300">1</span>
        )}
      </Badge>
    );
  }

  // 2 Wins: Radiant Platinum Double Champion
  if (winCount === 2) {
    return (
      <Badge
        variant="platinum"
        size={size}
        interactive={interactive}
        className={cn(
          'font-display shrink-0 font-extrabold tracking-wide select-none group/badge',
          className
        )}
        title="2x Contest Champion (2 Round Victories)"
        iconLeft={
          <Crown
            className={cn(
              'text-cyan-300 fill-cyan-300/80 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-transform duration-200 group-hover/badge:scale-110 animate-pulse',
              iconSizeClass
            )}
          />
        }
      >
        {showLabel ? (
          <span>2x Champion</span>
        ) : (
          <span className="font-mono text-[9px] font-bold text-cyan-200">2x</span>
        )}
      </Badge>
    );
  }

  // 3-4 Wins: Royal Amethyst Grand Champion
  if (winCount < 5) {
    return (
      <Badge
        variant="amethyst"
        size={size}
        interactive={interactive}
        className={cn(
          'font-display shrink-0 font-black tracking-wide select-none group/badge relative overflow-hidden',
          className
        )}
        title={`${winCount}x Grand Champion (${winCount} Round Victories)`}
        iconLeft={
          <Crown
            className={cn(
              'text-violet-300 fill-violet-300/90 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-transform duration-200 group-hover/badge:scale-110',
              iconSizeClass
            )}
          />
        }
        iconRight={
          <Sparkles
            className={cn(
              'text-amber-300 opacity-80 shrink-0 animate-spin',
              size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5'
            )}
            style={{ animationDuration: '6s' }}
          />
        }
      >
        {showLabel ? (
          <span>{winCount}x Grand Champion</span>
        ) : (
          <span className="font-mono text-[9px] font-bold text-violet-200">{winCount}x</span>
        )}
      </Badge>
    );
  }

  // 5+ Wins: Mythic Starlight Legend
  return (
    <Badge
      variant="mythic"
      size={size}
      interactive={interactive}
      className={cn(
        'font-display shrink-0 font-black tracking-wider select-none group/badge relative overflow-hidden border-amber-300/60',
        className
      )}
      title={`${winCount}x Mythic Legend (Hall of Fame Multi-Winner)`}
      iconLeft={
        <Flame
          className={cn(
            'text-amber-400 fill-orange-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-transform duration-200 group-hover/badge:scale-110 animate-bounce',
            iconSizeClass
          )}
        />
      }
      iconRight={
        <Trophy
          className={cn(
            'text-yellow-300 fill-yellow-300/90 drop-shadow-[0_0_6px_rgba(253,224,71,0.8)] shrink-0',
            size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5'
          )}
        />
      }
    >
      {showLabel ? (
        <span className="text-yellow-100 drop-shadow-sm">{winCount}x Legend</span>
      ) : (
        <span className="font-mono text-[9px] font-bold text-yellow-200">{winCount}x</span>
      )}
    </Badge>
  );
}
