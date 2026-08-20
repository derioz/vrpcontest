"use client";

/**
 * KokonutUI Toolbar Component
 * Reference: https://kokonutui.com/docs/navigation/toolbar
 * 
 * Figma-inspired floating toolbar where the selected tool expands to reveal its label
 * with spring animations, built with React, Motion, and Tailwind CSS.
 */

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ToolbarItem {
  id: string;
  title: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }> | React.ReactNode;
  badge?: string | number;
  badgeClassName?: string;
  accent?: boolean;
  notificationText?: string;
  onClick?: () => void;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  selectedId?: string | null;
  defaultSelected?: string | null;
  className?: string;
  itemClassName?: string;
  activeColor?: string;
  notificationPosition?: "top" | "bottom";
  showNotification?: boolean;
  rightElement?: React.ReactNode;
  onSelect?: (itemId: string) => void;
  size?: "sm" | "md" | "lg";
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : "0.25rem",
    paddingLeft: isSelected ? "0.875rem" : ".5rem",
    paddingRight: isSelected ? "0.875rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const notificationVariantsTop = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: -12, scale: 1 },
  exit: { opacity: 0, y: -22, scale: 0.95 },
};

const notificationVariantsBottom = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 12, scale: 1 },
  exit: { opacity: 0, y: 22, scale: 0.95 },
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

const springTransition = { type: "spring", stiffness: 450, damping: 30, mass: 0.7 };

export function Toolbar({
  items,
  selectedId: controlledSelectedId,
  defaultSelected = null,
  className,
  itemClassName,
  activeColor = "bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 text-white shadow-[0_2px_16px_rgba(234,88,12,0.4)] border border-orange-400/40",
  notificationPosition = "top",
  showNotification = true,
  rightElement,
  onSelect,
  size = "md",
}: ToolbarProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(defaultSelected);
  const selected = controlledSelectedId !== undefined ? controlledSelectedId : internalSelected;

  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleItemClick = (item: ToolbarItem) => {
    if (controlledSelectedId === undefined) {
      setInternalSelected(selected === item.id ? null : item.id);
    }
    onSelect?.(item.id);
    item.onClick?.();

    if (showNotification) {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      setActiveNotification(item.notificationText || `${item.title} selected`);
      notificationTimeoutRef.current = setTimeout(() => {
        setActiveNotification(null);
      }, 1600);
    }
  };

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const sizeClasses = {
    sm: "p-1 gap-1 text-xs",
    md: "p-1.5 gap-1.5 text-xs sm:text-sm",
    lg: "p-2 gap-2 text-sm",
  };

  const buttonSizeClasses = {
    sm: "py-1 text-xs rounded-lg min-h-[30px]",
    md: "py-1.5 text-xs sm:text-sm rounded-xl min-h-[36px]",
    lg: "py-2 text-sm rounded-xl min-h-[42px]",
  };

  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 15;

  const renderIcon = (icon: ToolbarItem["icon"], isSelected: boolean) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === "string") {
      return (
        <span className="text-sm sm:text-base leading-none transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
      );
    }
    // Handle React Component (functions or forwardRef objects like Lucide icons)
    const IconComponent = icon as React.ComponentType<{ className?: string; size?: number }>;
    return (
      <IconComponent
        size={iconSize}
        className={cn(
          "transition-transform duration-200 group-hover:scale-110",
          isSelected ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" : "text-white/60 group-hover:text-white"
        )}
      />
    );
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Floating Spring Notification Tooltip (Kokonut Signature) */}
      <AnimatePresence>
        {activeNotification && showNotification && (
          <motion.div
            key="toolbar-notification"
            animate="animate"
            className={cn(
              "absolute left-1/2 z-50 -translate-x-1/2 pointer-events-none whitespace-nowrap",
              notificationPosition === "top" ? "-top-8" : "-bottom-8"
            )}
            exit="exit"
            initial="initial"
            transition={{ duration: 0.25 }}
            variants={notificationPosition === "top" ? notificationVariantsTop : notificationVariantsBottom}
          >
            <div className="relative rounded-full bg-gradient-to-r from-fivem-orange via-orange-500 to-amber-500 px-3 py-1 text-white font-display text-[11px] font-bold tracking-wider uppercase shadow-[0_4px_20px_rgba(234,88,12,0.5)] border border-orange-300/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>{activeNotification}</span>
            </div>
            <motion.div
              animate="animate"
              className="absolute -bottom-1 left-1/2 h-[2px] w-3/4 -translate-x-1/2 origin-center bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]"
              exit="exit"
              initial="initial"
              variants={lineVariants}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Capsule */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center bg-[#09090e]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] select-none",
          sizeClasses[size],
          className
        )}
      >
        {/* Subtle travelling ambient edge line */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-fivem-orange/30 to-transparent pointer-events-none" />

        {/* Toolbar Items Cluster */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
          {items.map((item) => {
            const isSelected = selected === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                data-toolbar-item={item.id}
                animate="animate"
                custom={isSelected}
                initial={false}
                onClick={() => handleItemClick(item)}
                transition={springTransition}
                variants={buttonVariants}
                className={cn(
                  "relative flex items-center font-display font-semibold transition-colors duration-200 cursor-pointer overflow-hidden group",
                  buttonSizeClasses[size],
                  isSelected
                    ? activeColor
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]",
                  itemClassName
                )}
              >
                {/* Render Icon */}
                <div className="relative z-10 flex items-center justify-center shrink-0">
                  {renderIcon(item.icon, isSelected)}
                </div>

                {/* Animated Spring Expandable Label */}
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.span
                      key="title"
                      animate="animate"
                      className="relative z-10 overflow-hidden whitespace-nowrap leading-none tracking-wide text-xs sm:text-sm font-bold uppercase"
                      exit="exit"
                      initial="initial"
                      transition={springTransition}
                      variants={spanVariants}
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Optional Badge */}
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "relative z-10 ml-1 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md leading-none transition-colors",
                      isSelected
                        ? "bg-black/30 text-white shadow-inner"
                        : "bg-white/[0.06] text-white/50 group-hover:text-white group-hover:bg-white/10",
                      item.badgeClassName
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Optional Right Action Element (e.g. Toggle, Hall of Fame, Filter) */}
        {rightElement && (
          <div className="relative flex items-center pl-1 sm:pl-1.5 border-l border-white/[0.08] ml-1">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

export default Toolbar;
