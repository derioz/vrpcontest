"use client";

/**
 * Resizable navbar primitives.
 *
 * Adapted from Aceternity UI's "Resizable Navbar" (https://ui.aceternity.com/components/resizable-navbar,
 * MIT-style Aceternity licence). Changes for this project: lucide icons instead of Tabler, a dark-only
 * palette, scroll state shared through context instead of cloneElement, and items that carry their
 * own handlers, active state and badges.
 *
 * At the top of the page the bar is flat and transparent. Past `threshold` px of scroll it contracts
 * into a floating glass pill.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const CompactContext = createContext(false);
const useCompact = () => useContext(CompactContext);

const PILL_SHADOW =
  "0 8px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 1px 0 rgba(255, 255, 255, 0.06) inset";

const SPRING = { type: "spring", stiffness: 200, damping: 40 } as const;

export function Navbar({
  children,
  className,
  threshold = 60,
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <CompactContext.Provider value={compact}>
      <div className={cn("relative w-full", className)}>{children}</div>
    </CompactContext.Provider>
  );
}

export function NavBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const compact = useCompact();

  return (
    <motion.div
      animate={{
        width: compact ? "84%" : "100%",
        y: compact ? 4 : 0,
        backdropFilter: compact ? "blur(18px)" : "blur(0px)",
        boxShadow: compact ? PILL_SHADOW : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={SPRING}
      className={cn(
        "relative mx-auto hidden h-14 w-full flex-row items-center justify-between rounded-full px-3 lg:flex",
        compact ? "bg-[#09090b]/70" : "bg-transparent",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export interface NavItem {
  id: string;
  label: string;
  /** Small text shown after the label, e.g. "Beta". */
  badge?: string;
  onClick: () => void;
}

export function NavItems({
  items,
  activeId,
  className,
}: {
  items: NavItem[];
  activeId?: string | null;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      className={cn("hidden items-center gap-0.5 lg:flex", className)}
    >
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onMouseEnter={() => setHovered(item.id)}
            onFocus={() => setHovered(item.id)}
            onBlur={() => setHovered(null)}
            onClick={item.onClick}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200",
              active ? "text-white" : "text-white/55 hover:text-white",
            )}
          >
            {hovered === item.id && (
              <motion.span
                layoutId="site-nav-hover"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-white/[0.07]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {item.badge && (
                <span className="text-[10px] font-medium text-fivem-orange">
                  {item.badge}
                </span>
              )}
            </span>
            {active && (
              <span className="absolute bottom-0.5 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-fivem-orange" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MobileNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const compact = useCompact();

  return (
    <motion.div
      animate={{
        width: compact ? "92%" : "100%",
        y: compact ? 4 : 0,
        backdropFilter: compact ? "blur(18px)" : "blur(0px)",
        boxShadow: compact ? PILL_SHADOW : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={SPRING}
      className={cn(
        "relative mx-auto flex h-14 w-full flex-col justify-center rounded-full px-3 lg:hidden",
        compact ? "bg-[#09090b]/70" : "bg-transparent",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function MobileNavHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-row items-center justify-between", className)}>
      {children}
    </div>
  );
}
