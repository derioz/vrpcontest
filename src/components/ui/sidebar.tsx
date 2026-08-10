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
        "hidden md:flex flex-col justify-between bg-[#08080b]/95 border-r border-white/10 px-3 py-4 shrink-0 transition-all duration-300 relative z-20 shadow-2xl",
        className
      )}
      animate={{
        width: animate ? (open ? "260px" : "72px") : "260px",
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {/* Toggle button on sidebar top right */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#121218] text-white/60 hover:text-white hover:border-fivem-orange/50 transition-all shadow-md cursor-pointer"
        title={open ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {open ? <PanelLeftClose size={12} /> : <PanelLeftOpen size={12} />}
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
  color?: string;
  isDanger?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarLink = ({
  label,
  icon,
  active = false,
  badge,
  color = "text-fivem-orange",
  isDanger = false,
  onClick,
  className,
}: SidebarLinkProps) => {
  const { open } = useSidebar();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer w-full text-left my-0.5",
        isDanger
          ? active
            ? "bg-gradient-to-r from-red-600/35 via-red-500/20 to-transparent text-white border border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            : "text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30"
          : active
            ? "bg-gradient-to-r from-fivem-orange/20 via-fivem-orange/10 to-transparent text-white border border-fivem-orange/30 shadow-[0_0_16px_rgba(234,88,12,0.15)]"
            : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent",
        className
      )}
      title={!open ? label : undefined}
    >
      {/* Active Indicator Bar */}
      {active && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className={cn(
            "absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full shadow-[0_0_8px]",
            isDanger ? "bg-red-500 shadow-red-500/50" : "bg-fivem-orange shadow-fivem-orange/50"
          )}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      {/* Icon Container */}
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-lg shrink-0 transition-transform group-hover:scale-110",
          active ? color : "text-white/50 group-hover:text-white"
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
            className="flex items-center justify-between flex-1 min-w-0 font-display"
          >
            <span className="truncate tracking-wide">{label}</span>
            {badge !== undefined && (
              <span className="ml-2 px-2 py-0.5 rounded-md bg-fivem-orange/20 border border-fivem-orange/40 text-[10px] font-mono font-bold text-fivem-orange shrink-0">
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
