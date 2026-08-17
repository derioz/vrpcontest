import React from 'react';
import { cn } from '../../lib/utils';

export interface GlowLineProps {
  orientation?: 'horizontal' | 'vertical';
  color?: 'orange' | 'amber' | 'cyan' | 'purple' | 'emerald';
  className?: string;
}

const colorMaps = {
  orange: {
    core: 'via-fivem-orange/80',
    glow: 'via-fivem-orange/40',
    ambient: 'via-amber-500/20',
  },
  amber: {
    core: 'via-amber-400/80',
    glow: 'via-amber-400/40',
    ambient: 'via-yellow-500/20',
  },
  cyan: {
    core: 'via-cyan-400/80',
    glow: 'via-cyan-400/40',
    ambient: 'via-teal-500/20',
  },
  purple: {
    core: 'via-purple-400/80',
    glow: 'via-purple-400/40',
    ambient: 'via-violet-500/20',
  },
  emerald: {
    core: 'via-emerald-400/80',
    glow: 'via-emerald-400/40',
    ambient: 'via-emerald-500/20',
  },
};

export const GlowLine: React.FC<GlowLineProps> = ({
  orientation = 'horizontal',
  color = 'orange',
  className,
}) => {
  const scheme = colorMaps[color];

  if (orientation === 'vertical') {
    return (
      <div className={cn('relative w-px h-full', className)}>
        {/* Ambient Blur */}
        <div
          className={cn(
            'absolute inset-y-0 -left-2 w-5 bg-gradient-to-b from-transparent to-transparent blur-md opacity-70 pointer-events-none',
            scheme.ambient
          )}
        />
        {/* Glow Core */}
        <div
          className={cn(
            'absolute inset-y-0 -left-0.5 w-1.5 bg-gradient-to-b from-transparent to-transparent blur-sm pointer-events-none',
            scheme.glow
          )}
        />
        {/* Center Line */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent to-transparent',
            scheme.core
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative h-px w-full', className)}>
      {/* Ambient Blur */}
      <div
        className={cn(
          'absolute inset-x-0 -top-2 h-5 bg-gradient-to-r from-transparent to-transparent blur-md opacity-70 pointer-events-none',
          scheme.ambient
        )}
      />
      {/* Glow Core */}
      <div
        className={cn(
          'absolute inset-x-0 -top-0.5 h-1.5 bg-gradient-to-r from-transparent to-transparent blur-sm pointer-events-none',
          scheme.glow
        )}
      />
      {/* Center Line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
          scheme.core
        )}
      />
    </div>
  );
};
