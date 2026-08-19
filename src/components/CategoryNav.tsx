/**
 * CategoryNav — The Single Adaptive Permanent Category Navigation Component
 *
 * Sits directly attached underneath the Main Navbar as the permanent secondary
 * navigation header. Features a one-of-a-kind cyber-glass segmented track,
 * Framer Motion moving active indicator, subtle micro-interactions, zero layout shifts,
 * and zero hover popup expansions.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compute category entry counts from memory with zero network overhead
  const getCategoryCount = useCallback((catId: string) => {
    return allPhotos.filter(p => p.category_id === catId).length;
  }, [allPhotos]);

  // Check scroll bounds to show/hide chevrons and gradient edge fades
  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
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

  // Horizontally center the active category pill within the track ONLY (never scrolling the window)
  useEffect(() => {
    if (!selectedCategory || !trackRef.current) return;
    const track = trackRef.current;
    const activeEl = track.querySelector(`[data-category-id="${selectedCategory.id}"]`) as HTMLElement | null;
    if (activeEl) {
      const targetScroll = activeEl.offsetLeft - (track.clientWidth / 2) + (activeEl.clientWidth / 2);
      track.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [selectedCategory?.id]);

  // Mouse wheel horizontal scrolling on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      trackRef.current.scrollLeft += e.deltaY * 0.8;
    }
  };

  const scrollByAmount = (offset: number) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

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
      <div className="relative w-full rounded-2xl sm:rounded-2xl bg-[#09090e]/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
        
        {/* Subtle top travelling highlight line */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/40 to-transparent pointer-events-none" />

        {/* Interior noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

        {/* Content Container */}
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 relative z-10">

          {/* Left: Interactive Topics Beacon Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-fivem-orange/10 border border-fivem-orange/25 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.9)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fivem-orange font-mono flex items-center gap-1">
              <span className="hidden sm:inline">Topics</span>
              <span className="sm:hidden">Themes</span>
              <span className="opacity-75">({categories.length})</span>
            </span>
          </div>

          {/* Left Chevron Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-200)}
              className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Previous categories"
              aria-label="Previous categories"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Center: Connected Segmented Category Rail */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            {/* Dynamic Left Gradient Fade */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#09090e] to-transparent z-20" />
            )}

            {/* Dynamic Right Gradient Fade */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#09090e] to-transparent z-20" />
            )}

            <div
              ref={trackRef}
              onWheel={handleWheel}
              className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-0.5 py-0.5 touch-pan-x"
            >
              {categories.map((cat, index) => {
                const isActive = selectedCategory?.id === cat.id;
                const entryCount = getCategoryCount(cat.id);

                return (
                  <React.Fragment key={cat.id}>
                    <button
                      type="button"
                      data-category-id={cat.id}
                      onClick={() => onSelectCategory(cat)}
                      className={cn(
                        "relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display transition-all duration-150 cursor-pointer select-none group shrink-0",
                        isActive
                          ? "text-white font-black shadow-md shadow-orange-500/20"
                          : "text-white/70 hover:text-white font-semibold hover:bg-white/[0.06] active:scale-95"
                      )}
                    >
                      {/* Active Indicator Backdrop (Moving Framer Motion Spring Pill) */}
                      {isActive && (
                        <motion.div
                          layoutId="category-nav-active-pill"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 shadow-[0_2px_14px_rgba(234,88,12,0.4)] border border-orange-400/30"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}

                      {/* Emoji Icon with micro hover glow */}
                      <span className="relative z-10 text-sm sm:text-base leading-none shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {cat.emoji || '✨'}
                      </span>

                      {/* Category Name */}
                      <span className="relative z-10 truncate max-w-[130px] sm:max-w-[180px] leading-tight tracking-wide">
                        {cat.name}
                      </span>

                      {/* Micro Entry Count Badge */}
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

                    {/* Subtle separator between items (except active or adjacent) */}
                    {index < categories.length - 1 && (
                      <div className="w-[1px] h-3.5 bg-white/[0.06] shrink-0 pointer-events-none hidden sm:block" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right Chevron Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(200)}
              className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Next categories"
              aria-label="Next categories"
            >
              <ChevronRight size={14} />
            </button>
          )}

          {/* Right Active Indicator Pill on wide screens */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10 text-xs font-mono text-white/40">
            <span className="text-white/80 font-bold truncate max-w-[140px] font-display">
              {selectedCategory?.emoji} {selectedCategory?.name || 'All'}
            </span>
          </div>

        </div>
      </div>
    </nav>
  );
}

export default CategoryNav;
