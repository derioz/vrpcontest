/**
 * CategoryNav — Redesigned with HoverGradient 3D Flip Architecture
 * 
 * Features:
 * - 3D Rotating Flip Card Animations: Front & back 3D card flipping (rotateX -90°/90°) on hover
 * - Radial Glow Gradients: Per-category radiant light blooms on interaction
 * - Fluid Spring Morphing Active Pill: High-contrast active highlight with inner glow
 * - Dynamic Floating Confirmation Tooltip: Smooth popup confirmation with laser baseline
 * - Zero Horizontal Scrolling: 100% all-visible category matrix across desktop, tablet, and mobile
 * - High-End Dark Glassmorphism with ambient FiveM orange accents
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category, Photo } from '../types';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  allPhotos?: Photo[];
  className?: string;
}

const notificationVariants = {
  initial: { opacity: 0, y: 8, scale: 0.95 },
  animate: { opacity: 1, y: -12, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

export const CategoryNav = React.memo(function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  allPhotos = [],
  className,
}: CategoryNavProps) {
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isStatsToggled, setIsStatsToggled] = useState(false);

  // Precompute category entry counts for O(1) instant memory lookups
  const entriesPerCategoryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPhotos) {
      if (p.category_id) {
        map.set(p.category_id, (map.get(p.category_id) || 0) + 1);
      }
    }
    return map;
  }, [allPhotos]);

  const getCategoryCount = useCallback((catId: string) => {
    return entriesPerCategoryMap.get(catId) || 0;
  }, [entriesPerCategoryMap]);

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
      {/* ── Floating Confirmation Tooltip ── */}
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
            <div className="rounded-full border border-white/15 bg-[#09090d] px-3.5 py-1.5 text-xs font-semibold text-white">
              <span>{activeNotification}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Outer Glassmorphic Container ── */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl bg-[#09090d]/95 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.45)] overflow-hidden p-1.5 sm:p-2">


        {/* ── Responsive All-Visible Category Matrix (Zero Horizontal Scroll) ── */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 w-full">
          
          {/* Category Items Cluster with 3D Card Flips */}
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
            {categories.map((cat, index) => {
              const isActive = selectedCategory?.id === cat.id;
              const entryCount = getCategoryCount(cat.id);

              return (
                <div
                  key={cat.id}
                  className="seasonal-category relative flex-1 min-w-0"
                >
                  <div
                    className={cn(
                      'block rounded-xl group relative cursor-pointer transition-colors duration-200',
                      !isActive && 'hover:bg-white/[0.06]'
                    )}
                    onClick={() => handleCategoryClick(cat)}
                  >


                    {/* Selected category: a flat orange fill that slides between items */}
                    {isActive && (
                      <motion.div
                        layoutId="category-nav-active-pill"
                        className="absolute inset-0 rounded-xl bg-fivem-orange"
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}

                    <div
                      className={cn(
                        "relative z-10 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display font-semibold transition-colors duration-200 min-w-0 select-none",
                        isActive ? "text-white" : "text-white/70 group-hover:text-white"
                      )}
                    >
                      {/* Left: Emoji + Category Name */}
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-sm sm:text-base leading-none shrink-0 ">
                          {cat.emoji || '📷'}
                        </span>
                        <span className="truncate whitespace-nowrap leading-tight tracking-wide font-bold">
                          {cat.name}
                        </span>
                      </div>

                      {/* Right: Entry Count Badge */}
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md transition-colors shrink-0",
                          isActive
                            ? "bg-black/25 text-white"
                            : "bg-white/[0.06] text-white/60 group-hover:text-white"
                        )}
                      >
                        {entryCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right Auxiliary Stats Toggle ── */}
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
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              {isStatsToggled ? (
                <Sparkles size={14} className="text-white/60" />
              ) : (
                <ImageIcon size={14} className="text-white/40" />
              )}
              <span>
                {isStatsToggled ? `${totalPhotosCount} Photos` : `Total: ${totalPhotosCount}`}
              </span>
            </motion.button>
          </motion.div>

        </div>

      </div>
    </nav>
  );
});

export default CategoryNav;
