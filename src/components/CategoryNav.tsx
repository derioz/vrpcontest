/**
 * CategoryNav — Adaptive Grid & Matrix Navigation (Zero Horizontal Scrolling)
 *
 * Displays ALL contest categories simultaneously in an intelligent responsive
 * grid/matrix layout. Users see every category at once on desktop, tablet, and mobile
 * without any left-to-right scrolling or swiping.
 *
 * Features:
 * - Zero horizontal scrolling: 100% of categories visible immediately
 * - Responsive 2-column mobile / 3-4 column tablet & desktop adaptive grid
 * - Framer Motion shared layout spring morphing active indicator
 * - 100% readable unconstrained category titles
 * - Dimensionally stable with zero layout shift
 */

import React, { useCallback } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo } from '../types';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  allPhotos?: Photo[];
  className?: string;
}

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  allPhotos = [],
  className,
}: CategoryNavProps) {
  // Compute category entry counts from memory with zero network overhead
  const getCategoryCount = useCallback((catId: string) => {
    return allPhotos.filter(p => p.category_id === catId).length;
  }, [allPhotos]);

  if (categories.length === 0) return null;

  return (
    <nav
      id="category-nav"
      aria-label="Category Navigation"
      className={cn(
        "w-full select-none pointer-events-auto transition-all",
        className
      )}
    >
      {/* Outer Shell: Glassmorphic Capsule with Ambient Neon Accent Line */}
      <div className="relative w-full rounded-2xl bg-[#09090e]/94 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden p-1.5 sm:p-2">
        
        {/* Subtle top travelling highlight line */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/40 to-transparent pointer-events-none" />

        {/* Interior noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* ── Responsive All-Visible Category Matrix (Zero Horizontal Scroll) ── */}
        <div className={cn(
          "relative z-10 grid gap-1 sm:gap-1.5 w-full",
          // Mobile: 2 columns if 2+ categories, Tablet: 3-4 columns, Desktop: flex wrap or auto-fit
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
              <button
                key={cat.id}
                type="button"
                data-category-id={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={cn(
                  "relative flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display font-semibold transition-colors duration-200 cursor-pointer select-none group min-w-0",
                  isActive
                    ? "text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {/* Fluid Active Indicator Backdrop (Shared Morphing Spring Layout Animation) */}
                {isActive && (
                  <motion.div
                    layoutId="category-nav-active-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 shadow-[0_2px_16px_rgba(234,88,12,0.4),0_0_8px_rgba(251,146,60,0.2)] border border-orange-400/30 overflow-hidden"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 0.8,
                    }}
                  >
                    {/* Inner glowing edge highlight */}
                    <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    <div className="absolute bottom-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
                  </motion.div>
                )}

                {/* Left Content: Emoji Icon + Category Title */}
                <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base leading-none shrink-0 transition-transform duration-200 group-hover:scale-110">
                    {cat.emoji || '📷'}
                  </span>
                  <span className="truncate whitespace-nowrap leading-tight tracking-wide font-bold">
                    {cat.name}
                  </span>
                </div>

                {/* Right Content: Entry Count Badge */}
                <span
                  className={cn(
                    "relative z-10 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors duration-200 shrink-0",
                    isActive
                      ? "bg-black/30 text-white shadow-inner"
                      : "bg-white/[0.06] text-white/40 group-hover:text-white/80 group-hover:bg-white/10"
                  )}
                >
                  {entryCount}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}

export default CategoryNav;
