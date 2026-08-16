'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface FancyTabItem {
  id: string | number;
  name: string;
  icon?: React.ReactNode | string;
  badge?: string | number;
  description?: string;
  badgeColor?: string;
}

interface TabsFancyProps {
  tabs: FancyTabItem[];
  activeTab: string | number;
  onChange: (id: any) => void;
  className?: string;
  layoutId?: string;
  variant?: 'horizontal' | 'vertical' | 'responsive';
}

/**
 * SeraUI Tabs View: Fancy
 * Reference: https://seraui.com/docs/tabs-fancy
 */
export function TabsFancy({
  tabs,
  activeTab,
  onChange,
  className,
  layoutId = 'fancyTabBackground',
  variant = 'horizontal',
}: TabsFancyProps) {
  const isVertical = variant === 'vertical';
  const isResponsive = variant === 'responsive';

  return (
    <div
      className={cn(
        'rounded-2xl bg-black/40 border border-white/10 p-1.5 backdrop-blur-xl shadow-lg select-none',
        isVertical && 'flex flex-col gap-1 w-full',
        variant === 'horizontal' && 'flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x',
        isResponsive && 'flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all cursor-pointer whitespace-nowrap select-none shrink-0',
              isActive
                ? 'text-white shadow-md'
                : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04]'
            )}
          >
            {/* Background highlight for active tab with SeraUI gradient */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 rounded-xl shadow-[0_0_20px_rgba(234,88,12,0.35)] border border-orange-400/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            {/* Tab content with icon and text */}
            <div className="relative z-10 flex items-center gap-2">
              {typeof tab.icon === 'string' ? (
                <span className="text-base leading-none">{tab.icon}</span>
              ) : (
                tab.icon
              )}
              <span className="font-semibold">{tab.name}</span>
            </div>

            {/* Live Count / Badge */}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors ml-1',
                  isActive
                    ? 'bg-black/30 text-white border border-white/20'
                    : tab.badgeColor || 'bg-white/10 text-white/50 group-hover:bg-white/15'
                )}
              >
                {tab.badge}
              </span>
            )}

            {/* Small active dot indicator (SeraUI signature) */}
            {isActive ? (
              <motion.div
                layoutId={`${layoutId}-activeDot`}
                className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 500 }}
              />
            ) : (
              <div className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-white/20 transition-colors" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TabsFancy;
