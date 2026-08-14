import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category } from '../types';

interface StickyCategoryNavProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  topOffset: string | number;
}

export function StickyCategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  topOffset,
}: StickyCategoryNavProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

    const timeout = setTimeout(updateScrollBounds, 150);

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

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      exit={{ clipPath: 'inset(100% 0 0 0)' }}
      transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
      style={{ top: topOffset }}
      className="fixed left-0 right-0 z-40 px-2 sm:px-6 pointer-events-none flex justify-center"
    >
      {/* Outer shell with gradient border accents (matching navbar) */}
      <div className="pointer-events-auto w-full sm:w-[calc(100%-2rem)] sm:max-w-7xl mx-auto relative">
        {/* Gradient side accents */}
        <div className="hidden sm:block absolute top-[15%] bottom-[15%] left-0 w-[1px] bg-gradient-to-b from-transparent via-fivem-orange/20 to-transparent" />
        <div className="hidden sm:block absolute top-[15%] bottom-[15%] right-0 w-[1px] bg-gradient-to-b from-transparent via-fivem-orange/20 to-transparent" />
        <div className="absolute bottom-0 left-[5%] right-[5%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Frosted glass interior */}
        <div className="absolute inset-0 sm:inset-x-[1px] rounded-b-2xl rounded-t-none bg-[#0e0e14]/95 backdrop-blur-2xl shadow-[inset_0_-1px_0_rgba(255,255,255,0.05),0_16px_50px_rgba(0,0,0,0.7)]">
          {/* Noise texture */}
          <div
            className="absolute inset-0 rounded-b-2xl opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
          />
        </div>

        {/* Content layer */}
        <div className="relative z-10 px-2.5 sm:px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3.5 flex items-center gap-2 sm:gap-3">

          {/* Left: Filter Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-fivem-orange/15 border border-fivem-orange/30 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.8)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fivem-orange font-mono flex items-center gap-1">
              <span className="hidden sm:inline">Filter</span>
              <SlidersHorizontal size={11} className="sm:hidden" />
            </span>
          </div>

          {/* Left Scroll Navigation Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-240)}
              className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={15} />
            </button>
          )}

          {/* Center: Category pill track */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            {/* Dynamic Left Gradient Fade */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0e0e14] to-transparent z-10" />
            )}

            {/* Dynamic Right Gradient Fade */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0e0e14] to-transparent z-10" />
            )}

            <div
              ref={trackRef}
              onWheel={handleWheel}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1 py-1"
            >
              {categories.map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    ref={isActive ? activePillRef : null}
                    onClick={() => onSelectCategory(cat)}
                    title={cat.name}
                    className={cn(
                      "relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-display transition-all duration-200 cursor-pointer shrink-0 select-none",
                      "max-w-[160px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px]",
                      isActive
                        ? "text-white font-black shadow-lg shadow-orange-500/25"
                        : "text-white/80 hover:text-white font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.10] hover:border-white/[0.20]"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sticky-cat-active-pill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-fivem-orange to-orange-500 shadow-[0_4px_16px_rgba(234,88,12,0.35)]"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 text-sm sm:text-base leading-none shrink-0">{cat.emoji}</span>
                    <span className="relative z-10 truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Scroll Navigation Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(240)}
              className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight size={15} />
            </button>
          )}

          {/* Right: Active Category Badge (on wide viewports) */}
          <div className="hidden xl:flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-white/50 max-w-[200px] truncate">
            <span className="truncate">{selectedCategory?.name || 'All'}</span>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
