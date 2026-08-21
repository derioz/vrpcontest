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

// 3D Flip Card Animation Variants
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

// Curated radial gradients for vibrant category aesthetics
const CATEGORY_GRADIENTS = [
  'radial-gradient(circle, rgba(234,88,12,0.25) 0%, rgba(249,115,22,0.1) 50%, rgba(194,65,12,0) 100%)',
  'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.1) 50%, rgba(180,83,9,0) 100%)',
  'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.1) 50%, rgba(4,120,87,0) 100%)',
  'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.1) 50%, rgba(29,78,216,0) 100%)',
  'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(147,51,234,0.1) 50%, rgba(126,34,206,0) 100%)',
  'radial-gradient(circle, rgba(244,63,94,0.25) 0%, rgba(225,29,72,0.1) 50%, rgba(190,18,60,0) 100%)',
  'radial-gradient(circle, rgba(20,184,166,0.25) 0%, rgba(13,148,136,0.1) 50%, rgba(15,118,110,0) 100%)',
  'radial-gradient(circle, rgba(236,72,153,0.25) 0%, rgba(219,39,119,0.1) 50%, rgba(190,24,93,0) 100%)',
];

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

      {/* ── Outer Glassmorphic Container ── */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl bg-[#09090e]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden p-1.5 sm:p-2">
        
        {/* Subtle top travelling ambient highlight line */}
        <div className="absolute top-0 left-[8%] right-[8%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/40 to-transparent pointer-events-none" />

        {/* Interior subtle noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
        />

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
              const gradient = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

              return (
                <div
                  key={cat.id}
                  className="relative flex-1 min-w-0"
                >
                  <motion.div
                    className={cn(
                      'block rounded-xl overflow-visible group relative cursor-pointer',
                      isActive && 'bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_16px_rgba(234,88,12,0.2)] border border-white/10'
                    )}
                    style={{ perspective: '600px' }}
                    whileHover="hover"
                    initial="initial"
                    onClick={() => handleCategoryClick(cat)}
                  >
                    {/* Per-item radial glow bloom */}
                    <motion.div
                      className="absolute inset-0 z-0 pointer-events-none rounded-xl"
                      variants={glowVariants}
                      style={{
                        background: gradient,
                        opacity: 0,
                      }}
                    />

                    {/* Active Gradient Pill (Fluid Spring Morphing Indicator) */}
                    {isActive && (
                      <motion.div
                        layoutId="category-nav-active-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 shadow-[0_2px_16px_rgba(234,88,12,0.45),0_0_8px_rgba(251,146,60,0.25)] border border-orange-400/40 overflow-hidden z-0"
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      >
                        <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                        <div className="absolute bottom-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
                      </motion.div>
                    )}

                    {/* Front-Facing 3D Card */}
                    <motion.div
                      className={cn(
                        "relative z-10 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display font-semibold transition-colors duration-200 min-w-0 select-none",
                        isActive ? "text-white shadow-lg" : "text-white/70 group-hover:text-white"
                      )}
                      variants={itemVariants}
                      transition={sharedTransition}
                      style={{
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'center bottom',
                      }}
                    >
                      {/* Left: Emoji + Category Name */}
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-sm sm:text-base leading-none shrink-0 transition-transform duration-200 group-hover:scale-110">
                          {cat.emoji || '📷'}
                        </span>
                        <span className="truncate whitespace-nowrap leading-tight tracking-wide font-bold">
                          {cat.name}
                        </span>
                      </div>

                      {/* Right: Entry Count Badge */}
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors shrink-0",
                          isActive
                            ? "bg-black/30 text-white shadow-inner border border-white/10"
                            : "bg-white/[0.06] text-white/50 group-hover:text-white group-hover:bg-white/15"
                        )}
                      >
                        {entryCount}
                      </span>
                    </motion.div>

                    {/* Back-Facing 3D Card (Flipped State) */}
                    <motion.div
                      className={cn(
                        "absolute inset-0 z-10 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-display font-black transition-colors min-w-0 select-none",
                        isActive
                          ? "bg-gradient-to-r from-orange-600 via-fivem-orange to-amber-500 text-white"
                          : "bg-white/[0.05] text-white"
                      )}
                      variants={backVariants}
                      transition={sharedTransition}
                      style={{
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'center top',
                        transform: 'rotateX(90deg)',
                      }}
                    >
                      {/* Left: Emoji + Category Name */}
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-sm sm:text-base leading-none shrink-0 text-fivem-orange drop-shadow-[0_0_8px_rgba(234,88,12,0.9)]">
                          {cat.emoji || '📷'}
                        </span>
                        <span className="truncate whitespace-nowrap leading-tight tracking-wider font-extrabold uppercase">
                          {cat.name}
                        </span>
                      </div>

                      {/* Right: Entry Count Badge */}
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0",
                          isActive
                            ? "bg-black/40 text-white border border-white/20"
                            : "bg-fivem-orange/30 text-white border border-orange-400/30"
                        )}
                      >
                        {entryCount}
                      </span>
                    </motion.div>
                  </motion.div>
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
});

export default CategoryNav;
