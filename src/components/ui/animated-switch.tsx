/**
 * AnimatedSwitch & AnimatedControlCard
 * High-performance, luxury animated switch toggles with Framer Motion spring physics,
 * glowing neon halos, micro-icon morphing, and interactive status badges.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { Check, X, Sparkles, Shield, AlertTriangle } from "lucide-react";

interface AnimatedSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  activeColor?: string; // e.g. "from-cyan-500 to-blue-600"
  glowColor?: string; // e.g. "rgba(6, 182, 212, 0.4)"
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
}

export function AnimatedSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  activeColor = "from-fivem-orange to-amber-500",
  glowColor = "rgba(234, 88, 12, 0.45)",
  size = "md",
  ariaLabel,
}: AnimatedSwitchProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const trackWidth = isSm ? "w-11 h-6" : isLg ? "w-16 h-9" : "w-14 h-8";
  const thumbSize = isSm ? "w-4 h-4" : isLg ? "w-7 h-7" : "w-6 h-6";
  const thumbPadding = isSm ? "p-0.5" : "p-1";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full transition-all duration-300 select-none outline-none group focus-visible:ring-2 focus-visible:ring-white/40",
        trackWidth,
        thumbPadding,
        disabled && "opacity-40 cursor-not-allowed",
        checked
          ? "bg-gradient-to-r shadow-lg border border-white/20"
          : "bg-zinc-900 border border-white/10 hover:border-white/20",
        checked && activeColor
      )}
      style={{
        boxShadow: checked ? `0 0 20px ${glowColor}, inset 0 1px 2px rgba(255,255,255,0.3)` : "inset 0 2px 4px rgba(0,0,0,0.6)",
      }}
    >
      {/* Background Animated Halo when checked */}
      {checked && (
        <motion.div
          layoutId="switch-glow"
          className="absolute -inset-1 rounded-full opacity-60 blur-md pointer-events-none"
          style={{ backgroundColor: glowColor }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.75, scale: 1.05 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Sliding Thumb with Spring Physics */}
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 600,
          damping: 32,
        }}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full bg-white shadow-md text-zinc-900",
          thumbSize,
          checked ? "ml-auto" : "mr-auto"
        )}
      >
        {/* Micro status glyph inside thumb */}
        <AnimatePresence mode="wait" initial={false}>
          {checked ? (
            <motion.div
              key="checked-icon"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center text-zinc-900"
            >
              <Check size={isSm ? 10 : isLg ? 14 : 12} strokeWidth={3.5} />
            </motion.div>
          ) : (
            <motion.div
              key="unchecked-icon"
              initial={{ scale: 0, rotate: 45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -45 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center text-zinc-400"
            >
              <X size={isSm ? 9 : isLg ? 13 : 11} strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

interface AnimatedControlCardProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  icon: React.ReactNode;
  activeColor?: string;
  glowColor?: string;
  badgeActiveText?: string;
  badgeInactiveText?: string;
  disabled?: boolean;
  variant?: "default" | "warning" | "danger" | "emerald" | "purple" | "cyan";
  extraContent?: React.ReactNode;
}

export function AnimatedControlCard({
  title,
  description,
  checked,
  onToggle,
  icon,
  activeColor,
  glowColor,
  badgeActiveText = "ENABLED",
  badgeInactiveText = "DISABLED",
  disabled = false,
  variant = "default",
  extraContent,
}: AnimatedControlCardProps) {
  // Preset color mapping by variant
  const variantConfig = {
    default: {
      activeGradient: "from-fivem-orange to-orange-500",
      activeGlow: "rgba(234, 88, 12, 0.4)",
      badgeBg: "bg-fivem-orange/15 text-fivem-orange border-fivem-orange/30",
      iconActiveBg: "bg-fivem-orange/20 text-fivem-orange border-fivem-orange/40",
      cardActiveBorder: "border-fivem-orange/40 shadow-[0_0_30px_rgba(234,88,12,0.15)]",
    },
    cyan: {
      activeGradient: "from-cyan-500 via-teal-500 to-blue-500",
      activeGlow: "rgba(6, 182, 212, 0.4)",
      badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      iconActiveBg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
      cardActiveBorder: "border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]",
    },
    emerald: {
      activeGradient: "from-emerald-500 via-green-500 to-teal-500",
      activeGlow: "rgba(16, 185, 129, 0.4)",
      badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      iconActiveBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      cardActiveBorder: "border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    },
    purple: {
      activeGradient: "from-purple-500 via-indigo-500 to-violet-600",
      activeGlow: "rgba(168, 85, 247, 0.4)",
      badgeBg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      iconActiveBg: "bg-purple-500/20 text-purple-400 border-purple-500/40",
      cardActiveBorder: "border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]",
    },
    warning: {
      activeGradient: "from-amber-500 via-yellow-500 to-orange-500",
      activeGlow: "rgba(245, 158, 11, 0.45)",
      badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      iconActiveBg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      cardActiveBorder: "border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    },
    danger: {
      activeGradient: "from-red-600 via-rose-600 to-red-500",
      activeGlow: "rgba(239, 68, 68, 0.5)",
      badgeBg: "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse",
      iconActiveBg: "bg-red-500/25 text-red-400 border-red-500/50",
      cardActiveBorder: "border-red-500/50 bg-red-950/20 shadow-[0_0_35px_rgba(239,68,68,0.2)]",
    },
  }[variant];

  const currentGradient = activeColor || variantConfig.activeGradient;
  const currentGlow = glowColor || variantConfig.activeGlow;

  return (
    <motion.div
      layout
      transition={{ duration: 0.2 }}
      className={cn(
        "relative rounded-2xl p-5 sm:p-6 transition-all duration-300 overflow-hidden flex flex-col justify-between border backdrop-blur-xl group",
        checked
          ? cn("bg-[#0e0e16]/90", variantConfig.cardActiveBorder)
          : "bg-[#09090d]/80 border-white/[0.08] hover:border-white/20 hover:bg-[#0c0c12]/90",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Background subtle radial ambient light when checked */}
      {checked && (
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: currentGlow }}
        />
      )}

      {/* Top row: Icon + Title + Switch */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Animated Icon Emblem */}
          <div
            className={cn(
              "shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 shadow-md",
              checked
                ? variantConfig.iconActiveBg
                : "bg-white/[0.04] text-white/40 border-white/10 group-hover:text-white/70"
            )}
          >
            {icon}
          </div>

          {/* Title & Status Pill */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm sm:text-base font-bold font-display text-white tracking-wide">
                {title}
              </h3>
              {/* Dynamic Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider border transition-colors",
                  checked
                    ? variantConfig.badgeBg
                    : "bg-white/5 text-white/40 border-white/10"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    checked ? "bg-current animate-pulse" : "bg-white/30"
                  )}
                />
                <span>{checked ? badgeActiveText : badgeInactiveText}</span>
              </span>
            </div>

            <p className="text-xs text-white/55 leading-relaxed font-normal pr-2">
              {description}
            </p>
          </div>
        </div>

        {/* Animated Switch Element */}
        <div className="shrink-0 pt-0.5">
          <AnimatedSwitch
            checked={checked}
            onCheckedChange={onToggle}
            disabled={disabled}
            activeColor={currentGradient}
            glowColor={currentGlow}
            ariaLabel={title}
          />
        </div>
      </div>

      {/* Optional Extra Content (e.g. key generator button, warning alert) */}
      {extraContent && (
        <div className="mt-4 pt-4 border-t border-white/[0.08] w-full">
          {extraContent}
        </div>
      )}
    </motion.div>
  );
}

export default AnimatedSwitch;
