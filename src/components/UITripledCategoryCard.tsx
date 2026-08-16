import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Category } from '../types';
import { NumberTicker } from './ui/number-ticker';
import { ProgressBar } from './ui/progress';

interface UITripledCategoryCardProps {
  category: Category;
  index: number;
  isActive: boolean;
  entryCount: number;
  totalEntries: number;
  onSelect: () => void;
}

// Preset vibrant color schemes for category cards
const CATEGORY_THEMES = [
  {
    gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
    border: 'group-hover:border-orange-500/50',
    activeBorder: 'border-orange-500/80',
    accentColor: '#f97316',
    progressGradient: 'from-orange-500 to-amber-400',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.25)]',
  },
  {
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    border: 'group-hover:border-cyan-500/50',
    activeBorder: 'border-cyan-500/80',
    accentColor: '#06b6d4',
    progressGradient: 'from-cyan-500 to-blue-400',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.25)]',
  },
  {
    gradient: 'from-rose-500/20 via-purple-500/10 to-transparent',
    border: 'group-hover:border-rose-500/50',
    activeBorder: 'border-rose-500/80',
    accentColor: '#f43f5e',
    progressGradient: 'from-rose-500 to-purple-400',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.25)]',
  },
  {
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    border: 'group-hover:border-emerald-500/50',
    activeBorder: 'border-emerald-500/80',
    accentColor: '#10b981',
    progressGradient: 'from-emerald-500 to-teal-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]',
  },
  {
    gradient: 'from-indigo-500/20 via-fuchsia-500/10 to-transparent',
    border: 'group-hover:border-indigo-500/50',
    activeBorder: 'border-indigo-500/80',
    accentColor: '#6366f1',
    progressGradient: 'from-indigo-500 to-fuchsia-400',
    glow: 'shadow-[0_0_30px_rgba(99,102,241,0.25)]',
  },
];

export const UITripledCategoryCard: React.FC<UITripledCategoryCardProps> = ({
  category,
  index,
  isActive,
  entryCount,
  totalEntries,
  onSelect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = CATEGORY_THEMES[index % CATEGORY_THEMES.length];
  const percentage = totalEntries > 0 ? ((entryCount / totalEntries) * 100).toFixed(0) : '0';

  // 3D Tilt Spring Physics values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 20 });
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.div
      style={{ perspective: 1000 }}
      className="h-full select-none"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onSelect}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ scale: 1.02, z: 10 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex flex-col justify-between p-6 rounded-3xl cursor-pointer overflow-hidden transition-all duration-300 h-full backdrop-blur-xl border",
          isActive
            ? cn("bg-gradient-to-b from-[#16161a] to-[#0c0c0e]", theme.activeBorder, theme.glow)
            : "bg-[#0c0c0f]/80 hover:bg-[#121217]/90 border-white/[0.08] " + theme.border
        )}
      >

        {/* Specular Glare / Glass Reflection Following Cursor */}
        {isHovered && (
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-3xl z-10 transition-opacity duration-300"
            style={{
              background: `radial-gradient(400px circle at ${glareX.get()}% ${glareY.get()}%, rgba(255, 255, 255, 0.08), transparent 70%)`,
            }}
          />
        )}

        {/* Top Ambient Glow Spot */}
        <div className={cn("absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-opacity duration-500", theme.gradient, isHovered || isActive ? "opacity-100" : "opacity-30")} />

        {/* Card Header Content */}
        <div className="relative z-20 w-full flex flex-col gap-4">
          
          {/* Top Row: Prominent Floating Emoji & Selection Indicator */}
          <div className="flex items-start justify-between gap-3">
            
            {/* Prominent Floating Emoji without Box Container */}
            <div className="relative">
              <span className="text-4xl sm:text-5xl leading-none block transform group-hover:scale-115 group-hover:-translate-y-1 transition-transform duration-300 filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] select-none">
                {category.emoji || '✨'}
              </span>
              {isActive && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0c0c0e] rounded-full animate-pulse" />
              )}
            </div>

            {/* Selection Checkbox Pill */}
            <div className={cn(
              "w-6 h-6 rounded-xl border flex items-center justify-center transition-all duration-300 shrink-0",
              isActive
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                : "border-white/15 bg-white/[0.02] group-hover:border-white/30 text-transparent"
            )}>
              <CheckCircle2 className={cn("w-3.5 h-3.5 transition-transform duration-300", isActive ? "scale-100" : "scale-0")} />
            </div>

          </div>

          {/* Title & Prompt Description */}
          <div className="mt-1">
            <h4 className={cn(
              "text-base font-black tracking-tight font-display transition-colors mb-2 leading-snug",
              isActive ? "text-white" : "text-white/90 group-hover:text-white"
            )}>
              {category.name}
            </h4>

            {category.description && (
              <p className="text-xs font-normal text-white/60 group-hover:text-white/85 leading-relaxed transition-colors line-clamp-4">
                {category.description}
              </p>
            )}
          </div>

        </div>

        {/* Card Footer Stats */}
        <div className="relative z-20 w-full mt-6 pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40 uppercase tracking-widest text-[9px] font-bold">
              Submissions
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white font-display text-xs">
                <NumberTicker value={entryCount} />
              </span>
              <span className="text-white/30 text-[10px]">({percentage}%)</span>
            </div>
          </div>

          {/* Progress Bar Component */}
          <ProgressBar
            value={percentage}
            size="xs"
            glow={isActive || isHovered}
            className="mt-1"
          />
        </div>

      </motion.div>
    </motion.div>
  );
};
