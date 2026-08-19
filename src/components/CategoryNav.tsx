/**
 * CategoryNav — The Single Adaptive Category Navigation Component
 *
 * Sits in-flow on the landing page below Rules, and smoothly becomes sticky
 * directly underneath the main navbar (top-14 on mobile, top-16 on desktop)
 * with zero gaps, zero threshold flicker, and rich interactive hover states.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const trackRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  // Compute category entry counts from memory
  const getCategoryCount = useCallback((catId: string) => {
    return allPhotos.filter(p => p.category_id === catId).length;
  }, [allPhotos]);

  // Check scroll bounds to show/hide chevrons and gradient edge fades
  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds, { passive: true });
    const timeout = setTimeout(updateScrollBounds, 200);

    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
      clearTimeout(timeout);
    };
  }, [categories, updateScrollBounds]);

  // Center active category pill when selected
  useEffect(() => {
    if (activePillRef.current && trackRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setTimeout(updateScrollBounds, 350);
    }
  }, [selectedCategory?.id, updateScrollBounds]);

  // Mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      trackRef.current.scrollLeft += e.deltaY * 0.85;
    }
  };

  const scrollByAmount = (offset: number) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (categories.length === 0) return null;

  return (
    <div
      id="category-nav"
      className={cn(
        "sticky top-14 sm:top-16 z-30 w-full transition-all select-none",
        className
      )}
    >
      {/* Outer Shell with Glassmorphism and Top/Bottom Border Glows */}
      <div className="relative w-full bg-[#08080c]/92 backdrop-blur-2xl border-y border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
        
        {/* Subtle top & bottom ambient light bars */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/30 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Noise Texture */}
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3.5 relative z-10">

          {/* Left: Filter / Categories Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-fivem-orange/10 border border-fivem-orange/25 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.8)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fivem-orange font-mono flex items-center gap-1">
              <span className="hidden sm:inline">Topics</span>
              <span className="sm:hidden">Filter</span>
              <span className="opacity-80">({categories.length})</span>
            </span>
          </div>

          {/* Left Scroll Chevron */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-220)}
              className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={15} />
            </button>
          )}

          {/* Center: Horizontally Scrollable Category Rail */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            {/* Dynamic Left Gradient Fade */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#08080c] to-transparent z-20" />
            )}

            {/* Dynamic Right Gradient Fade */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#08080c] to-transparent z-20" />
            )}

            <div
              ref={trackRef}
              onWheel={handleWheel}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1 py-1 touch-pan-x"
            >
              {categories.map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                const isHovered = hoveredCatId === cat.id;
                const entryCount = getCategoryCount(cat.id);

                return (
                  <div
                    key={cat.id}
                    className="relative shrink-0"
                    onMouseEnter={() => setHoveredCatId(cat.id)}
                    onMouseLeave={() => setHoveredCatId(null)}
                  >
                    <button
                      ref={isActive ? activePillRef : null}
                      type="button"
                      onClick={() => onSelectCategory(cat)}
                      className={cn(
                        "relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-display transition-all duration-200 cursor-pointer select-none group border",
                        isActive
                          ? "text-white font-black shadow-lg shadow-orange-500/20 border-fivem-orange/40"
                          : "text-white/70 hover:text-white font-semibold bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.20]"
                      )}
                    >
                      {/* Active Background Pill (Framer Motion spring layout animation) */}
                      {isActive && (
                        <motion.div
                          layoutId="unified-cat-active-pill"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fivem-orange/90 to-orange-500/90 shadow-[0_4px_16px_rgba(234,88,12,0.35)]"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}

                      {/* Emoji Icon */}
                      <span className="relative z-10 text-base leading-none shrink-0 drop-shadow-sm">
                        {cat.emoji || '✨'}
                      </span>

                      {/* Category Name */}
                      <span className="relative z-10 truncate max-w-[140px] sm:max-w-[200px] leading-tight">
                        {cat.name}
                      </span>

                      {/* Count Badge */}
                      <span
                        className={cn(
                          "relative z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors",
                          isActive
                            ? "bg-black/30 text-white shadow-inner"
                            : "bg-white/[0.06] text-white/40 group-hover:text-white/80 group-hover:bg-white/10"
                        )}
                      >
                        {entryCount}
                      </span>
                    </button>

                    {/* Rich Desktop Hover Card / Tooltip (zero layout shift, smoothly appears on hover) */}
                    <AnimatePresence>
                      {isHovered && cat.description && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 rounded-2xl bg-[#0c0c14]/95 border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 pointer-events-none"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{cat.emoji}</span>
                            <span className="text-xs font-bold text-white font-display truncate">{cat.name}</span>
                            <span className="ml-auto text-[9px] font-mono text-fivem-orange font-bold bg-fivem-orange/15 px-1.5 py-0.5 rounded">
                              {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/60 leading-snug line-clamp-3">
                            {cat.description}
                          </p>
                          {/* Triangle indicator pointing up to pill */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c0c14] border-t border-l border-white/15 rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Scroll Chevron */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(220)}
              className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight size={15} />
            </button>
          )}

          {/* Right: Active Category Quick Summary (on wide screens) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 pl-2 border-l border-white/10 text-xs font-mono text-white/40">
            <span className="text-[10px] uppercase tracking-wider text-white/30">Active:</span>
            <span className="text-white/80 font-bold truncate max-w-[130px] font-display">
              {selectedCategory?.emoji} {selectedCategory?.name || 'All'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CategoryNav;
