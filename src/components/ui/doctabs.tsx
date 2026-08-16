import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface DocTabItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  emoji?: string;
  type?: 'tab';
}

export interface DocTabSeparator {
  type: 'separator';
  id?: string;
  title?: never;
  icon?: never;
  badge?: never;
  emoji?: never;
}

export type DocTab = DocTabItem | DocTabSeparator;

interface DocTabsProps {
  tabs: DocTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'dock' | 'pills' | 'gradient';
  layoutId?: string;
}

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: {
    width: 'auto',
    opacity: 1,
    transition: { delay: 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    width: 0,
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

/**
 * SeraUI DocTabs Component
 * Reference: https://seraui.com/docs/doctabs
 */
export const DocTabs: React.FC<DocTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'dock',
  layoutId = 'seraui-doctab-pill',
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 p-1.5 rounded-full border border-white/10 bg-[#0c0c14]/90 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] select-none',
        className
      )}
    >
      {tabs.map((tab, idx) => {
        if (tab.type === 'separator') {
          return (
            <div
              key={tab.id || `sep-${idx}`}
              className="h-5 w-px bg-white/15 mx-0.5 shrink-0"
              aria-hidden="true"
            />
          );
        }

        const isSelected = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold font-display uppercase tracking-wider transition-colors focus:outline-none cursor-pointer shrink-0',
              isSelected
                ? 'text-white'
                : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'
            )}
          >
            {/* Animated Active Pill Indicator */}
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                className={cn(
                  'absolute inset-0 z-0 rounded-full border shadow-md',
                  variant === 'gradient'
                    ? 'bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 border-orange-400/40 shadow-fivem-orange/30'
                    : 'bg-white/[0.12] border-fivem-orange/40 bg-gradient-to-r from-fivem-orange/20 to-amber-500/15 shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                )}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            <span className="relative z-10 flex items-center gap-2">
              {tab.emoji && <span className="text-sm leading-none">{tab.emoji}</span>}
              {Icon && <Icon className="h-4 w-4 shrink-0 text-fivem-orange" />}
              
              {/* Expandable text */}
              <AnimatePresence initial={false}>
                {(isSelected || variant === 'pills') && (
                  <motion.span
                    variants={spanVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {tab.title}
                  </motion.span>
                )}
              </AnimatePresence>

              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold transition-colors',
                    isSelected
                      ? 'bg-fivem-orange text-white'
                      : 'bg-white/10 text-white/60'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface VerticalDocTabItem {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
  emoji?: string;
}

interface VerticalDocTabsProps {
  tabs: VerticalDocTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  layoutId?: string;
}

/**
 * Vertical DocTabs with Badges & Spring Highlight
 */
export const VerticalDocTabs: React.FC<VerticalDocTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  layoutId = 'seraui-v-tab-pill',
}) => {
  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer select-none',
              isSelected
                ? 'text-white font-bold'
                : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fivem-orange/20 to-amber-500/15 border border-fivem-orange/40 backdrop-blur-md shadow-[0_0_20px_rgba(234,88,12,0.25)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            <div className="relative z-10 flex items-center gap-3 w-full min-w-0">
              {tab.emoji && <span className="text-base shrink-0">{tab.emoji}</span>}
              {Icon && (
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isSelected ? 'text-fivem-orange' : 'text-white/40 group-hover:text-white/70'
                  )}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-xs font-display tracking-tight truncate">{tab.title}</div>
                {tab.description && (
                  <div className="text-[10px] text-white/40 truncate font-sans font-normal">
                    {tab.description}
                  </div>
                )}
              </div>

              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-[10px] font-mono font-bold shrink-0',
                    isSelected
                      ? 'bg-fivem-orange/30 text-fivem-orange border border-fivem-orange/40'
                      : 'bg-white/10 text-white/50'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
