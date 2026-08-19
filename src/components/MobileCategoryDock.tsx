import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category } from '../types';

interface MobileCategoryDockProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  visible: boolean;
}

export function MobileCategoryDock({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
}: MobileCategoryDockProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollBounds = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollBounds, { passive: true });
    window.addEventListener('resize', updateScrollBounds, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateScrollBounds);
      window.removeEventListener('resize', updateScrollBounds);
    };
  }, [categories, updateScrollBounds]);

  // Auto-center active pill when selection changes
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          className="fixed bottom-0 left-0 right-0 z-40 sm:hidden pointer-events-none"
        >
          <div className="pointer-events-auto mx-2 mb-2 safe-bottom">
            {/* Frosted glass dock container */}
            <div className="relative rounded-2xl overflow-hidden">
              {/* Glass background */}
              <div className="absolute inset-0 bg-[#0a0a0f]/92 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]" />

              {/* Top edge glow accent */}
              <div
                className="absolute top-0 left-[10%] right-[10%] h-[1px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(234,88,12,0.5), transparent)',
                }}
              />

              {/* Noise texture */}
              <div
                className="absolute inset-0 rounded-2xl opacity-[0.025] mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
              />

              {/* Content */}
              <div className="relative z-10 px-2 py-2.5 flex items-center gap-1.5">
                {/* Left scroll arrow */}
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => trackRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
                    className="shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/15 text-white/70 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}

                {/* Category pill track */}
                <div className="relative flex-1 min-w-0 overflow-hidden">
                  {/* Left fade */}
                  {canScrollLeft && (
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
                  )}
                  {/* Right fade */}
                  {canScrollRight && (
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
                  )}

                  <div
                    ref={trackRef}
                    className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-0.5 py-0.5 touch-pan-x"
                  >
                    {categories.map((cat) => {
                      const isActive = selectedCategory?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          ref={isActive ? activePillRef : null}
                          onClick={() => onSelectCategory(cat)}
                          className={cn(
                            "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display font-bold shrink-0 transition-all duration-150 cursor-pointer select-none min-h-[40px]",
                            isActive
                              ? "text-white shadow-md"
                              : "text-white/65 active:text-white bg-white/[0.05] active:bg-white/[0.10] border border-white/[0.08]"
                          )}
                        >
                          {/* Active background pill with layoutId */}
                          {isActive && (
                            <motion.div
                              layoutId="mobile-dock-active-pill"
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange to-orange-500 shadow-[0_2px_12px_rgba(234,88,12,0.4)]"
                              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 text-sm leading-none">{cat.emoji || '✨'}</span>
                          <span className="relative z-10 truncate max-w-[100px]">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right scroll arrow */}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => trackRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
                    className="shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/15 text-white/70 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
