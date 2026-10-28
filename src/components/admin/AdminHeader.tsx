import React from 'react';
import { cn } from '../../lib/utils';

export interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminHeader({
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
          <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-white/50 mt-0.5 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
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
