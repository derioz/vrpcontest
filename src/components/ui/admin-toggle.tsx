/**
 * ElevenLabs-inspired Toggle Switch
 * Premium sliding toggle with glow effects for admin panels
 */

import React from "react";
import { cn } from "../../lib/utils";

interface AdminToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  activeColor?: string;
  activeGlow?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function AdminToggle({
  label,
  description,
  checked,
  onToggle,
  activeColor = "bg-emerald-500",
  activeGlow = "shadow-[0_0_12px_rgba(34,197,94,0.5)]",
  icon,
  disabled = false,
}: AdminToggleProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-300",
        checked
          ? "bg-white/[0.04] border-white/[0.12]"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className={cn(
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
            checked ? "bg-white/10 text-white" : "bg-white/5 text-white/40"
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{label}</p>
          {description && (
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Toggle track */}
      <button
        onClick={() => onToggle(!checked)}
        disabled={disabled}
        className={cn(
          "relative shrink-0 w-12 h-7 rounded-full transition-all duration-300 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
          checked
            ? cn(activeColor, activeGlow)
            : "bg-white/10 hover:bg-white/15"
        )}
        aria-checked={checked}
        role="switch"
      >
        {/* Toggle thumb */}
        <div
          className={cn(
            "absolute top-1 w-5 h-5 rounded-full shadow-md transition-all duration-300",
            checked
              ? "left-6 bg-white scale-100"
              : "left-1 bg-white/70 scale-90"
          )}
        />
        {/* Active inner glow */}
        {checked && (
          <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: '2s' }} />
        )}
      </button>
    </div>
  );
}
