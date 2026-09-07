import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const Dropdown = DropdownMenu;

export interface DropdownTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {
  showChevron?: boolean;
}

export const DropdownTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  DropdownTriggerProps
>(({ className, children, showChevron = false, asChild = false, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    asChild={asChild}
    className={cn(
      "cursor-pointer select-none inline-flex items-center outline-none focus:outline-none",
      className
    )}
    {...props}
  >
    {children}
    {showChevron && (
      <ChevronDown
        size={14}
        className="ml-1.5 text-white/50 transition-transform duration-200 [[data-state=open]>&]:rotate-180 [[data-state=open]>&]:text-white"
      />
    )}
  </DropdownMenuPrimitive.Trigger>
));
DropdownTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export interface DropdownContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  width?: string;
}

export const DropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownContentProps
>(({ className, sideOffset = 6, align = "end", width = "w-72", children, ...props }, ref) => {
  const mappedAlign: "start" | "center" | "end" =
    align === "left" || align === "start"
      ? "start"
      : align === "center"
      ? "center"
      : "end";

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={mappedAlign}
        collisionPadding={12}
        className={cn(
          "z-[150] min-w-[8rem] rounded-2xl border border-white/10 dark:border-zinc-800 bg-[#0c0c14]/98 dark:bg-zinc-900/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] ring-1 ring-black/20 dark:ring-white/5 backdrop-blur-2xl text-white select-none focus:outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          width,
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownContent.displayName = DropdownMenuPrimitive.Content.displayName;

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  shortcut?: string;
  variant?: "default" | "danger" | "warning" | "primary" | "success";
  active?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, children, icon, badge, shortcut, variant = "default", active = false, onClick, onSelect, ...props }, ref) => {
  const variantStyles = {
    default: active
      ? "bg-white/10 text-white font-semibold"
      : "text-zinc-300 hover:text-white hover:bg-white/[0.08] focus:text-white focus:bg-white/[0.08]",
    primary: active
      ? "bg-orange-500/20 text-orange-400 font-semibold"
      : "text-zinc-300 hover:text-orange-300 hover:bg-orange-500/10 focus:text-orange-300 focus:bg-orange-500/10",
    danger: active
      ? "bg-rose-500/20 text-rose-300 font-semibold"
      : "text-rose-400/90 hover:text-rose-200 hover:bg-rose-500/15 focus:text-rose-200 focus:bg-rose-500/15",
    warning: active
      ? "bg-amber-500/20 text-amber-300 font-semibold"
      : "text-amber-400/90 hover:text-amber-200 hover:bg-amber-500/15 focus:text-amber-200 focus:bg-amber-500/15",
    success: active
      ? "bg-emerald-500/20 text-emerald-300 font-semibold"
      : "text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-500/15 focus:text-emerald-200 focus:bg-emerald-500/15",
  }[variant];

  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      onClick={onClick}
      onSelect={onSelect}
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 group",
        variantStyles,
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && (
          <span className="shrink-0 text-zinc-400 group-hover:text-current group-focus:text-current transition-colors">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>
      {(badge || shortcut) && (
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {badge}
          {shortcut && (
            <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
              {shortcut}
            </span>
          )}
        </div>
      )}
    </DropdownMenuPrimitive.Item>
  );
});
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownItem = DropdownMenuItem;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("h-px my-1.5 bg-white/[0.08] dark:bg-zinc-800/80", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const DropdownDivider = DropdownMenuSeparator;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export const DropdownMenuBadge: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "orange" | "emerald" | "rose" | "amber" | "blue" | "purple";
  className?: string;
}> = ({ children, variant = "default", className }) => {
  const styles = {
    default: "bg-white/10 text-white/70 border-white/10",
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    purple: "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent",
  }[variant];

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm",
        styles,
        className
      )}
    >
      {children}
    </span>
  );
};

// Fallback stub for backward compatibility
export function useDropdown() {
  return { isOpen: false, setIsOpen: () => {}, closeDropdown: () => {} };
}
