import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium select-none transition-all duration-200 border rounded-full backdrop-blur-md',
  {
    variants: {
      variant: {
        default:
          'bg-white/[0.08] hover:bg-white/[0.12] border-white/15 text-white shadow-sm',
        secondary:
          'bg-zinc-800/80 hover:bg-zinc-700/80 border-zinc-700/60 text-zinc-300',
        outline:
          'bg-transparent hover:bg-white/[0.05] border-white/20 text-white/90',
        destructive:
          'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
        success:
          'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        warning:
          'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
        info:
          'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
        gold:
          'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/25 border-amber-400/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        platinum:
          'bg-gradient-to-r from-cyan-500/15 via-teal-400/10 to-cyan-500/15 hover:from-cyan-500/25 hover:to-cyan-500/25 border-cyan-400/40 text-cyan-100 shadow-[0_0_14px_rgba(6,182,212,0.3)]',
        amethyst:
          'bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-violet-500/20 hover:from-violet-500/30 hover:to-violet-500/30 border-violet-400/45 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,0.35)]',
        mythic:
          'bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border-amber-300/50 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.45)]',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[9px] font-mono leading-none gap-1',
        sm: 'px-2 py-0.5 text-[10px] font-medium leading-none gap-1.2',
        md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
        lg: 'px-3.5 py-1.5 text-sm font-bold gap-2',
      },
      glow: {
        true: 'shadow-lg',
        false: '',
      },
      interactive: {
        true: 'cursor-pointer active:scale-95 hover:scale-[1.03]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      glow: false,
      interactive: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant,
  size,
  glow,
  interactive,
  iconLeft,
  iconRight,
  ...props
}) => {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size, glow, interactive }),
        className
      )}
      {...props}
    >
      {iconLeft && <span className="shrink-0 flex items-center">{iconLeft}</span>}
      {children && <span className="truncate">{children}</span>}
      {iconRight && <span className="shrink-0 flex items-center">{iconRight}</span>}
    </div>
  );
};
