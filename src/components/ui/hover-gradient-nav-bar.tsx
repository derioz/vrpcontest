'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '../../lib/utils';

export interface HoverGradientMenuItem {
  id?: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  gradient?: string;
  iconColor?: string;
  badge?: string | number;
  badgeClassName?: string;
  active?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  renderCustom?: React.ReactNode;
}

export interface HoverGradientNavBarProps {
  items?: HoverGradientMenuItem[];
  className?: string;
  activeId?: string | null;
  onItemClick?: (item: HoverGradientMenuItem) => void;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

// Animation variants for 3D flip effect
const itemVariants: Variants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants: Variants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 1.8,
    transition: {
      opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.4, type: 'spring', stiffness: 300, damping: 25 },
    },
  },
};

const sharedTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 18,
  duration: 0.4,
};

export function HoverGradientNavBar({
  items = [],
  className,
  activeId,
  onItemClick,
  rightElement,
  leftElement,
}: HoverGradientNavBarProps): React.JSX.Element {
  return (
    <nav
      aria-label="Hover Gradient Navigation"
      className={cn(
        'relative flex items-center justify-center p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl',
        'bg-[#09090e]/90 backdrop-blur-2xl border border-white/[0.08]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]',
        'select-none',
        className
      )}
    >
      {/* Ambient travelling top edge highlight */}
      <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/30 to-transparent pointer-events-none" />

      {leftElement && (
        <div className="relative z-10 flex items-center pr-2 border-r border-white/[0.08] mr-1.5">
          {leftElement}
        </div>
      )}

      <ul className="flex items-center justify-center gap-1 sm:gap-2 relative z-10">
        {items.map((item: HoverGradientMenuItem, index: number) => {
          const isActive = activeId !== undefined ? activeId === (item.id || item.label) : item.active;
          const defaultGradient = item.gradient || 'radial-gradient(circle, rgba(234,88,12,0.2) 0%, rgba(249,115,22,0.08) 50%, rgba(194,65,12,0) 100%)';
          const defaultIconColor = item.iconColor || 'group-hover:text-fivem-orange text-white/70';

          return (
            <motion.li
              key={item.id || item.label || index}
              className="relative flex-none"
            >
              <motion.div
                className={cn(
                  'block rounded-xl sm:rounded-2xl overflow-visible group relative cursor-pointer',
                  isActive && 'bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_16px_rgba(234,88,12,0.2)] border border-white/10'
                )}
                style={{ perspective: '600px' }}
                whileHover="hover"
                initial="initial"
                onClick={(e) => {
                  if (item.onClick) item.onClick(e);
                  if (onItemClick) onItemClick(item);
                }}
              >
                {/* Per-item radial glow */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none rounded-xl sm:rounded-2xl"
                  variants={glowVariants}
                  style={{
                    background: defaultGradient,
                    opacity: 0,
                  }}
                />

                {/* Front-facing 3D Flip Card */}
                <motion.div
                  className={cn(
                    'flex items-center justify-center gap-1.5 sm:gap-2',
                    'px-2.5 sm:px-3.5 py-1.5 sm:py-2 relative z-10',
                    'bg-transparent font-display font-bold text-xs uppercase tracking-wider',
                    isActive ? 'text-white' : 'text-white/70 group-hover:text-white',
                    'transition-colors rounded-xl sm:rounded-2xl'
                  )}
                  variants={itemVariants}
                  transition={sharedTransition}
                  style={{
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center bottom',
                  }}
                >
                  <span className={cn('transition-colors duration-300 flex items-center justify-center shrink-0', defaultIconColor, isActive && 'text-fivem-orange drop-shadow-[0_0_6px_rgba(234,88,12,0.8)]')}>
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'ml-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md leading-none',
                        item.badgeClassName || 'bg-white/10 text-white/70 group-hover:bg-fivem-orange/20 group-hover:text-orange-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.div>

                {/* Back-facing 3D Flip Card */}
                <motion.div
                  className={cn(
                    'flex items-center justify-center gap-1.5 sm:gap-2',
                    'px-2.5 sm:px-3.5 py-1.5 sm:py-2 absolute inset-0 z-10',
                    'bg-white/[0.04] font-display font-black text-xs uppercase tracking-wider',
                    'text-white transition-colors rounded-xl sm:rounded-2xl shadow-inner'
                  )}
                  variants={backVariants}
                  transition={sharedTransition}
                  style={{
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center top',
                    transform: 'rotateX(90deg)',
                  }}
                >
                  <span className={cn('transition-colors duration-300 flex items-center justify-center shrink-0', defaultIconColor, 'text-fivem-orange drop-shadow-[0_0_8px_rgba(234,88,12,0.9)]')}>
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'ml-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md leading-none',
                        item.badgeClassName || 'bg-fivem-orange/30 text-white border border-orange-400/30'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </motion.div>
            </motion.li>
          );
        })}
      </ul>

      {rightElement && (
        <div className="relative z-10 flex items-center pl-2 border-l border-white/[0.08] ml-1.5">
          {rightElement}
        </div>
      )}
    </nav>
  );
}

export default HoverGradientNavBar;
