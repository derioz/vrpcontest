/**
 * CategoryNav — Redesigned with KokonutUI Toolbar Architecture
 * Reference: https://kokonutui.com/docs/navigation/toolbar
 *
 * Features:
 * - KokonutUI Spring Animations: Selected category morphs and expands with spring physics
 * - Dynamic Floating Notification Bubble: Floating confirmation with glowing accent line on category switch
 * - KokonutUI Action Toggle: Integrated right-aligned stats & view toggle pill
 * - Zero Horizontal Scrolling: Fully responsive adaptive layout with 100% visibility
 * - High-End Dark Glassmorphism with ambient FiveM orange accents
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Sparkles, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo } from '../types';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  allPhotos?: Photo[];
  className?: string;
}

const buttonSpring = { type: "spring", stiffness: 450, damping: 30, mass: 0.7 };

const buttonVariants = {
  initial: {
    gap: "0.375rem",
    paddingLeft: "0.625rem",
    paddingRight: "0.625rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? "0.5rem" : "0.375rem",
    paddingLeft: isSelected ? "0.875rem" : "0.625rem",
    paddingRight: isSelected ? "0.875rem" : "0.625rem",
  }),
};

const spanVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const notificationVariants = {
  initial: { opacity: 0, y: 8, scale: 0.95 },
  animate: { opacity: 1, y: -12, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

const lineVariants = {
  initial: { scaleX: 0, x: "-50%" },
  animate: {
    scaleX: 1,
    x: "0%",
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    scaleX: 0,
    x: "50%",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  allPhotos = [],
  className,
}: CategoryNavProps) {
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStatsToggled, setIsStatsToggled] = useState(false);

  // Compute category entry counts from memory
  const getCategoryCount = useCallback((catId: string) => {
    return allPhotos.filter(p => p.category_id === catId).length;
  }, [allPhotos]);

  const totalPhotosCount = allPhotos.length;

  const handleCategoryClick = (cat: Category) => {
    onSelectCategory(cat);
    const count = getCategoryCount(cat.id);
    const countText = `${count} ${count === 1 ? 'entry' : 'entries'}`;

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setActiveNotification(`${cat.emoji || '📷'} ${cat.name} • ${countText}`);
    notificationTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  if (categories.length === 0) return null;

  return (
    <nav
      id="category-nav"
      aria-label="Category Navigation"
      className={cn(
        "relative w-full select-none pointer-events-auto transition-all",
        className
      )}
    >
      {/* ── KokonutUI Floating Spring Notification Bubble ── */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            key="category-notification"
            animate="animate"
            className="absolute -top-7 left-1/2 z-50 -translate-x-1/2 pointer-events-none whitespace-nowrap"
            exit="exit"
            initial="initial"
            transition={{ duration: 0.25 }}
            variants={notificationVariants as any}
          >
            <div className="relative rounded-full bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 px-3.5 py-1 text-white font-display text-[11px] font-black tracking-wider uppercase shadow-[0_4px_24px_rgba(234,88,12,0.6)] border border-orange-300/40 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{activeNotification}</span>
            </div>
            <motion.div
              animate="animate"
              className="absolute -bottom-1 left-1/2 h-[2px] w-3/4 -translate-x-1/2 origin-center bg-amber-300 rounded-full shadow-[0_0_8px_#f59e0b]"
              exit="exit"
              initial="initial"
              variants={lineVariants as any}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KokonutUI Outer Glassmorphic Toolbar Container ── */}
      <div className="relative w-full rounded-2xl bg-[#09090e]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden p-1.5 sm:p-2">
        
        {/* Subtle top travelling ambient highlight line */}
        <div className="absolute top-0 left-[8%] right-[8%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/40 to-transparent pointer-events-none" />

        {/* Interior subtle noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* ── Kokonut Toolbar Category Grid (Adaptive Zero-Scroll Matrix) ── */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 w-full">
          
          {/* Category Items */}
          <div className={cn(
            "grid gap-1 sm:gap-1.5 flex-1 w-full",
            categories.length <= 2 
              ? "grid-cols-2" 
              : categories.length === 3 
                ? "grid-cols-3" 
                : categories.length === 4 
                  ? "grid-cols-2 sm:grid-cols-4" 
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          )}>
            {categories.map((cat) => {
              const isActive = selectedCategory?.id === cat.id;
              const entryCount = getCategoryCount(cat.id);

              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  data-category-id={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  animate="animate"
                  custom={isActive}
                  initial={false}
                  transition={buttonSpring}
                  variants={buttonVariants as any}
                  className={cn(
                    "relative flex items-center justify-between gap-1.5 sm:gap-2 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all duration-200 cursor-pointer select-none group min-w-0 overflow-hidden",
                    isActive
                      ? "text-white shadow-lg"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {/* Fluid Active Spring Pill Backdrop */}
                  {isActive && (
                    <motion.div
                      layoutId="kokonut-category-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 shadow-[0_2px_16px_rgba(234,88,12,0.45),0_0_8px_rgba(251,146,60,0.25)] border border-orange-400/40 overflow-hidden"
                      transition={buttonSpring}
                    >
                      {/* Top & bottom glowing edge highlight */}
                      <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                      <div className="absolute bottom-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
                    </motion.div>
                  )}

                  {/* Left Content: Category Emoji + Name */}
                  <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="text-sm sm:text-base leading-none shrink-0 transition-transform duration-200 group-hover:scale-110">
                      {cat.emoji || '📷'}
                    </span>
                    <motion.span
                      variants={spanVariants as any}
                      animate="animate"
                      className="truncate whitespace-nowrap leading-tight tracking-wide font-bold"
                    >
                      {cat.name}
                    </motion.span>
                  </div>

                  {/* Right Content: Entry Count Badge with Spring feedback */}
                  <motion.span
                    layout
                    className={cn(
                      "relative z-10 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors duration-200 shrink-0",
                      isActive
                        ? "bg-black/30 text-white shadow-inner border border-white/10"
                        : "bg-white/[0.06] text-white/40 group-hover:text-white/90 group-hover:bg-white/10"
                    )}
                  >
                    {entryCount}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>

          {/* ── KokonutUI Auxiliary Stats / Filter Toggle ── */}
          <motion.div
            className="hidden xl:flex items-center shrink-0 pl-1.5 border-l border-white/[0.08]"
          >
            <motion.button
              type="button"
              onClick={() => setIsStatsToggled(!isStatsToggled)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-display font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none",
                isStatsToggled
                  ? "bg-gradient-to-r from-fivem-orange/20 to-amber-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_12px_rgba(234,88,12,0.2)]"
                  : "bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              {isStatsToggled ? (
                <Sparkles size={14} className="text-fivem-orange" />
              ) : (
                <ImageIcon size={14} className="text-white/40" />
              )}
              <span>
                {isStatsToggled ? `${totalPhotosCount} Photos Live` : `Total: ${totalPhotosCount}`}
              </span>
            </motion.button>
          </motion.div>

        </div>

      </div>
    </nav>
  );
}

export default CategoryNav;
