import React, { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, ShieldCheck, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    return { open: true, setOpen: () => {}, animate: false };
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(true);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <DesktopSidebar {...props} />
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <motion.div
      className={cn(
        "hidden md:flex flex-col justify-between bg-[#07070b]/98 backdrop-blur-3xl border-r border-white/10 px-3 py-4 shrink-0 transition-all duration-300 relative z-20 shadow-2xl",
        className
      )}
      animate={{
        width: animate ? (open ? "280px" : "78px") : "280px",
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {/* Toggle collapse button on sidebar top right */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="absolute -right-3.5 top-6 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#121218] text-white/70 hover:text-white hover:border-fivem-orange/60 hover:scale-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.8)] cursor-pointer"
        title={open ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {open ? <PanelLeftClose size={13} className="text-fivem-orange" /> : <PanelLeftOpen size={13} className="text-white/80" />}
      </button>

      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {children}
      </div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex md:hidden flex-row items-center justify-between bg-[#08080b]/95 border-b border-white/10 px-4 py-3 w-full shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between w-full">
        {children}
      </div>
    </div>
  );
};

export interface SidebarLinkProps {
  key?: any;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  badgeColor?: string;
  color?: string;
  glowColor?: string;
  description?: string;
  isDanger?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarLink = ({
  label,
  icon,
  active = false,
  badge,
  badgeColor,
  color = "text-fivem-orange",
  glowColor = "from-fivem-orange/20 to-transparent",
  description,
  isDanger = false,
  onClick,
  className,
}: SidebarLinkProps) => {
  const { open } = useSidebar();

  return (
    <motion.button
      type="button"
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3.5 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer w-full text-left my-1 select-none overflow-hidden",
        isDanger
          ? active
            ? "bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent text-white border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
            : "text-red-400/80 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/[0.14] border border-red-500/20"
          : active
            ? cn("text-white border shadow-lg bg-gradient-to-r", glowColor, "border-white/20")
            : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent",
        className
      )}
      title={!open ? label : undefined}
    >
      {/* Active Capsule Pill Motion Indicator */}
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className={cn(
            "absolute inset-0 rounded-2xl border pointer-events-none z-0",
            isDanger
              ? "bg-red-500/15 border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]"
              : "bg-white/[0.04] border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]"
          )}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}

      {/* Active Left Vertical Accent Line */}
      {active && (
        <motion.div
          layoutId="sidebar-active-bar"
          className={cn(
            "absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-[0_0_10px]",
            isDanger ? "bg-red-500 shadow-red-500/80" : "bg-fivem-orange shadow-fivem-orange/80"
          )}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
        />
      )}

      {/* Icon Container with glowing micro-animation */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center w-7 h-7 rounded-xl shrink-0 transition-all duration-200 group-hover:scale-110",
          active
            ? isDanger
              ? "bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
              : "bg-white/10 border border-white/20 " + color + " shadow-[0_0_12px_rgba(255,255,255,0.1)]"
            : "bg-white/[0.03] border border-white/[0.06] text-white/50 group-hover:text-white group-hover:border-white/15 group-hover:bg-white/5"
        )}
      >
        {icon}
      </div>

      {/* Text & Badge (Animated visible when expanded) */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 flex items-center justify-between flex-1 min-w-0 font-display"
          >
            <div className="flex flex-col min-w-0 pr-1">
              <span className="truncate tracking-wide text-xs font-bold leading-tight">{label}</span>
              {description && (
                <span className="text-[10px] text-white/35 font-mono truncate font-normal mt-0.5">{description}</span>
              )}
            </div>
            {badge !== undefined && (
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border",
                  badgeColor || "bg-fivem-orange/20 border-fivem-orange/40 text-fivem-orange shadow-[0_0_8px_rgba(234,88,12,0.3)]"
                )}
              >
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
