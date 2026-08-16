import React from 'react';
import { cn } from '../../lib/utils';

// Custom SVG Icons for SeraUI Verification Badges
export const BasicVerifyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <path
      d="M12 2L4 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-8-4z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M12 2L4 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-8-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="m9 12 2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GoldVerifyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10" fill="url(#serauiGoldGrad)" fillOpacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="url(#serauiGoldGrad)" strokeWidth="1.4" fill="none" />
    <path
      d="M12 4L5.5 7v5c0 4.2 2.8 7.8 6.5 9 3.7-1.2 6.5-4.8 6.5-9V7L12 4z"
      fill="url(#serauiGoldGrad)"
      fillOpacity="0.25"
      stroke="url(#serauiGoldGrad)"
      strokeWidth="1.3"
      fillRule="evenodd"
    />
    <path
      d="m9.5 12 1.8 1.8 3.5-3.5"
      stroke="#FFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="serauiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

export const PremiumVerifyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={cn('shrink-0', className)}
  >
    <circle cx="12" cy="12" r="10" fill="url(#serauiPremiumGrad)" fillOpacity="0.15" />
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="url(#serauiPremiumGrad)"
      strokeWidth="1.5"
      fill="none"
      strokeDasharray="2 2"
      className="animate-spin"
      style={{ animationDuration: '8s' }}
    />
    <path
      d="M12 3.5L8 8.5h8l-4-5zM8 8.5l4 11 4-11H8z"
      fill="url(#serauiPremiumGrad)"
      fillOpacity="0.35"
      stroke="url(#serauiPremiumGrad)"
      strokeWidth="1.2"
    />
    <path
      d="m10.5 12 1 1 2-2"
      stroke="#FFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="serauiPremiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="35%" stopColor="#EC4899" />
        <stop offset="70%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
  </svg>
);

export type VerifyBadgeType = 'basic' | 'gold' | 'premium';

export interface VerifyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  type: VerifyBadgeType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

const verifyConfig: Record<
  VerifyBadgeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    bg: string;
    border: string;
    text: string;
    glow: string;
  }
> = {
  basic: {
    icon: BasicVerifyIcon,
    label: 'Verified',
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    border: 'border-blue-400/30',
    text: 'text-blue-300',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.15)]',
  },
  gold: {
    icon: GoldVerifyIcon,
    label: 'Gold Verified',
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    border: 'border-amber-400/30',
    text: 'text-amber-200',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  },
  premium: {
    icon: PremiumVerifyIcon,
    label: 'Premium Verified',
    bg: 'bg-purple-500/10 dark:bg-purple-500/10',
    border: 'border-purple-400/35',
    text: 'text-purple-200',
    glow: 'shadow-[0_0_14px_rgba(168,85,247,0.25)]',
  },
};

const verifySizes = {
  xs: { badge: 'px-1.5 py-0.5 text-[9px] gap-1', icon: 'w-3 h-3' },
  sm: { badge: 'px-2 py-0.5 text-[10px] gap-1.2', icon: 'w-3.5 h-3.5' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5', icon: 'w-4 h-4' },
  lg: { badge: 'px-3.5 py-1.5 text-sm gap-2', icon: 'w-5 h-5' },
};

export const VerifyBadge = React.forwardRef<HTMLDivElement, VerifyBadgeProps>(
  ({ type, size = 'sm', showLabel = true, animate = true, className, ...props }, ref) => {
    const config = verifyConfig[type];
    const sz = verifySizes[size];
    const IconComponent = config.icon;

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-display font-semibold select-none transition-all duration-200',
          'backdrop-blur-md border',
          animate && 'hover:scale-[1.03] active:scale-95',
          sz.badge,
          config.bg,
          config.border,
          config.text,
          config.glow,
          className
        )}
        {...props}
      >
        <IconComponent className={sz.icon} />
        {showLabel && <span className="tracking-wide">{config.label}</span>}
      </div>
    );
  }
);
VerifyBadge.displayName = 'VerifyBadge';

export const VerifyIcon = React.forwardRef<HTMLDivElement, Omit<VerifyBadgeProps, 'showLabel'>>(
  (props, ref) => <VerifyBadge {...props} showLabel={false} ref={ref} />
);
VerifyIcon.displayName = 'VerifyIcon';
