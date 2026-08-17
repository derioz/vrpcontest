import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface AnnouncementProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'gold' | 'emerald';
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  showArrow?: boolean;
}

export const Announcement: React.FC<AnnouncementProps> = ({
  children,
  variant = 'gradient',
  badge,
  badgeColor,
  icon,
  showArrow = false,
  className,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full px-3.5 py-1 text-xs select-none transition-all duration-300',
        'backdrop-blur-xl border shadow-lg group',
        variant === 'gradient' &&
          'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-fivem-orange/40 text-white/90 shadow-[0_0_20px_rgba(0,0,0,0.4)]',
        variant === 'gold' &&
          'bg-amber-500/10 hover:bg-amber-500/15 border-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        variant === 'emerald' &&
          'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-400/30 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        variant === 'default' &&
          'bg-[#0c0c14]/90 hover:bg-[#141420]/90 border-white/10 text-white/80',
        className
      )}
      {...props}
    >
      {badge && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider',
            badgeColor || 'bg-fivem-orange/20 text-fivem-orange border border-fivem-orange/30'
          )}
        >
          {badge}
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="font-display font-medium tracking-wide flex items-center gap-1.5 truncate">
        {children}
      </span>
      {showArrow && (
        <ArrowRight
          size={12}
          className="text-white/40 group-hover:text-fivem-orange group-hover:translate-x-0.5 transition-all"
        />
      )}
    </motion.div>
  );
};
