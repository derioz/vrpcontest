import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeDropdown: () => void;
}

export const DropdownContext = createContext<DropdownContextType | null>(null);

export function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a DropdownMenu');
  }
  return context;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  className,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setIsOpen = (value: React.SetStateAction<boolean>) => {
    const nextValue = typeof value === 'function' ? value(isOpen) : value;
    if (!isControlled) {
      setUncontrolledOpen(nextValue);
    }
    onOpenChange?.(nextValue);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const closeDropdown = () => setIsOpen(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, closeDropdown }}>
      <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const Dropdown = DropdownMenu;

export interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  showChevron?: boolean;
  asChild?: boolean;
}

export const DropdownTrigger: React.FC<DropdownTriggerProps> = ({
  children,
  className,
  showChevron = false,
}) => {
  const context = useDropdown();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        context.setIsOpen((prev) => !prev);
      }}
      className={cn('cursor-pointer select-none inline-flex items-center', className)}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={context.isOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          context.setIsOpen((prev) => !prev);
        }
      }}
    >
      {children}
      {showChevron && (
        <ChevronDown
          size={14}
          className={cn(
            'ml-1.5 text-white/50 transition-transform duration-200',
            context.isOpen && 'rotate-180 text-white'
          )}
        />
      )}
    </div>
  );
};

export interface DropdownContentProps {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  width?: string;
}

export const DropdownContent: React.FC<DropdownContentProps> = ({
  children,
  align = 'right',
  className,
  width = 'w-72',
}) => {
  const context = useDropdown();

  const alignmentClass = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align];

  return (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute top-full mt-2 z-50 rounded-2xl border border-white/10 dark:border-zinc-800 bg-[#0c0c14]/98 dark:bg-zinc-900/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] ring-1 ring-black/10 dark:ring-white/5 backdrop-blur-2xl text-white select-none focus:outline-none',
            width,
            alignmentClass,
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface DropdownMenuItemProps {
  children: ReactNodeOrFn;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  shortcut?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'default' | 'danger' | 'warning' | 'primary' | 'success';
  active?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
}

type ReactNodeOrFn = React.ReactNode;

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  icon,
  badge,
  shortcut,
  onClick,
  className,
  variant = 'default',
  active = false,
  disabled = false,
  closeOnClick = true,
}) => {
  const context = useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnClick && context) {
      context.closeDropdown();
    }
  };

  const variantStyles = {
    default: active
      ? 'bg-white/10 text-white font-semibold'
      : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]',
    primary: active
      ? 'bg-orange-500/20 text-orange-400 font-semibold'
      : 'text-zinc-300 hover:text-orange-300 hover:bg-orange-500/10',
    danger: active
      ? 'bg-rose-500/20 text-rose-300 font-semibold'
      : 'text-rose-400/90 hover:text-rose-200 hover:bg-rose-500/15',
    warning: active
      ? 'bg-amber-500/20 text-amber-300 font-semibold'
      : 'text-amber-400/90 hover:text-amber-200 hover:bg-amber-500/15',
    success: active
      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
      : 'text-emerald-400/90 hover:text-emerald-200 hover:bg-emerald-500/15',
  }[variant];

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]',
        variantStyles,
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && (
          <span className="shrink-0 text-zinc-400 group-hover:text-current transition-colors">
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
    </button>
  );
};

export const DropdownItem = DropdownMenuItem;

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('h-px my-1.5 bg-white/[0.08] dark:bg-zinc-800/80', className)} />
);

export const DropdownDivider = DropdownMenuSeparator;

export const DropdownMenuLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500',
      className
    )}
  >
    {children}
  </div>
);

export const DropdownMenuBadge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'orange' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const styles = {
    default: 'bg-white/10 text-white/70 border-white/10',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    purple: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent',
  }[variant];

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm',
        styles,
        className
      )}
    >
      {children}
    </span>
  );
};
