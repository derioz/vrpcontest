import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeDropdown: () => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export interface DropdownProps {
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
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

export interface DropdownTriggerProps {
  children: React.ReactNode;
  className?: string;
  showChevron?: boolean;
}

export const DropdownTrigger: React.FC<DropdownTriggerProps> = ({
  children,
  className,
  showChevron = true,
}) => {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownTrigger must be used within a Dropdown');

  return (
    <button
      type="button"
      onClick={() => context.setIsOpen((prev) => !prev)}
      className={cn(
        'inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-white text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer select-none active:scale-98',
        className
      )}
      aria-expanded={context.isOpen}
    >
      <span>{children}</span>
      {showChevron && (
        <ChevronDown
          size={14}
          className={cn(
            'text-white/60 transition-transform duration-200',
            context.isOpen && 'rotate-180 text-white'
          )}
        />
      )}
    </button>
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
  width = 'w-56',
}) => {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownContent must be used within a Dropdown');

  const alignmentClass = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align];

  return (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'absolute top-full mt-2 z-50 rounded-2xl border border-white/10 bg-[#0c0c14]/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white select-none',
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

export interface DropdownItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'default' | 'danger' | 'warning';
  disabled?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  icon,
  onClick,
  className,
  variant = 'default',
  disabled = false,
}) => {
  const context = useContext(DropdownContext);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onClick?.(e);
    context?.closeDropdown();
  };

  const variantStyles = {
    default: 'text-white/80 hover:text-white hover:bg-white/10',
    danger: 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/20',
    warning: 'text-amber-400 hover:text-amber-200 hover:bg-amber-500/20',
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        variantStyles,
        className
      )}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
};

export const DropdownDivider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('h-px my-1 bg-white/[0.08]', className)} />
);
