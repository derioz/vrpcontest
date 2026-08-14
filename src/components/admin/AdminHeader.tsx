import React from 'react';
import { cn } from '../../lib/utils';

export interface AdminHeaderProps {
  badge: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminHeader({
  badge,
  badgeColor = "bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30",
  title,
  subtitle,
  icon,
  iconBg = "bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30",
  actions,
  className
}: AdminHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10", className)}>
      <div className="flex items-start gap-3.5">
        <div className={cn("p-2.5 rounded-2xl border shrink-0 mt-0.5 shadow-md flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        <div>
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border mb-1.5 shadow-sm", badgeColor)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{badge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}

export default AdminHeader;
