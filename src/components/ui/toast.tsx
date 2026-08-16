import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
}

type ToastArg = string | ToastOptions | undefined;

function parseToastArgs(title: string, arg?: ToastArg): { description?: string; options: ToastOptions } {
  if (typeof arg === 'string') {
    return { description: arg, options: {} };
  }
  if (arg && typeof arg === 'object') {
    return { description: arg.description, options: arg };
  }
  return { description: undefined, options: {} };
}

let globalToastAdd: ((toast: Omit<ToastItem, 'id'>, customId?: string) => string) | null = null;
let globalToastRemove: ((id?: string) => void) | null = null;

export interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>, customId?: string) => string;
  removeToast: (id?: string) => void;
  success: (title: string, arg?: ToastArg) => string;
  error: (title: string, arg?: ToastArg) => string;
  warning: (title: string, arg?: ToastArg) => string;
  info: (title: string, arg?: ToastArg) => string;
  loading: (title: string, arg?: ToastArg) => string;
  dismiss: (id?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Callable function + method table
export interface ToastFn {
  (title: string, arg?: ToastArg): string;
  success: (title: string, arg?: ToastArg) => string;
  error: (title: string, arg?: ToastArg) => string;
  warning: (title: string, arg?: ToastArg) => string;
  info: (title: string, arg?: ToastArg) => string;
  loading: (title: string, arg?: ToastArg) => string;
  dismiss: (id?: string) => void;
}

export const toast: ToastFn = Object.assign(
  (title: string, arg?: ToastArg) => {
    const { description, options } = parseToastArgs(title, arg);
    if (globalToastAdd) {
      return globalToastAdd({ type: 'info', title, description, duration: options.duration }, options.id);
    }
    return options.id || '';
  },
  {
    success: (title: string, arg?: ToastArg) => {
      const { description, options } = parseToastArgs(title, arg);
      if (globalToastAdd) {
        return globalToastAdd({ type: 'success', title, description, duration: options.duration }, options.id);
      }
      return options.id || '';
    },
    error: (title: string, arg?: ToastArg) => {
      const { description, options } = parseToastArgs(title, arg);
      if (globalToastAdd) {
        return globalToastAdd({ type: 'error', title, description, duration: options.duration }, options.id);
      }
      return options.id || '';
    },
    warning: (title: string, arg?: ToastArg) => {
      const { description, options } = parseToastArgs(title, arg);
      if (globalToastAdd) {
        return globalToastAdd({ type: 'warning', title, description, duration: options.duration }, options.id);
      }
      return options.id || '';
    },
    info: (title: string, arg?: ToastArg) => {
      const { description, options } = parseToastArgs(title, arg);
      if (globalToastAdd) {
        return globalToastAdd({ type: 'info', title, description, duration: options.duration }, options.id);
      }
      return options.id || '';
    },
    loading: (title: string, arg?: ToastArg) => {
      const { description, options } = parseToastArgs(title, arg);
      if (globalToastAdd) {
        return globalToastAdd({ type: 'loading', title, description, duration: options.duration ?? 0 }, options.id);
      }
      return options.id || '';
    },
    dismiss: (id?: string) => {
      if (globalToastRemove) globalToastRemove(id);
    },
  }
);

const toastConfig = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/35',
    bgColor: 'bg-[#0a1410]/95',
    glow: 'shadow-[0_12px_40px_rgba(16,185,129,0.25)]',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/35',
    bgColor: 'bg-[#150a0d]/95',
    glow: 'shadow-[0_12px_40px_rgba(244,63,94,0.25)]',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/35',
    bgColor: 'bg-[#14100a]/95',
    glow: 'shadow-[0_12px_40px_rgba(245,158,11,0.25)]',
  },
  info: {
    icon: Info,
    iconColor: 'text-fivem-orange',
    borderColor: 'border-fivem-orange/35',
    bgColor: 'bg-[#140e0a]/95',
    glow: 'shadow-[0_12px_40px_rgba(234,88,12,0.3)]',
  },
  loading: {
    icon: Loader2,
    iconColor: 'text-amber-400 animate-spin',
    borderColor: 'border-amber-500/35',
    bgColor: 'bg-[#12100d]/95',
    glow: 'shadow-[0_12px_40px_rgba(245,158,11,0.25)]',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id?: string) => {
    if (!id) {
      setToasts([]);
      return;
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (newToast: Omit<ToastItem, 'id'>, customId?: string) => {
      const id = customId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = newToast.duration ?? (newToast.type === 'loading' ? 0 : 4500);

      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered.slice(-4), { ...newToast, id, duration }];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    globalToastAdd = addToast;
    globalToastRemove = removeToast;
    return () => {
      globalToastAdd = null;
      globalToastRemove = null;
    };
  }, [addToast, removeToast]);

  const success = useCallback((title: string, arg?: ToastArg) => toast.success(title, arg), []);
  const error = useCallback((title: string, arg?: ToastArg) => toast.error(title, arg), []);
  const warning = useCallback((title: string, arg?: ToastArg) => toast.warning(title, arg), []);
  const info = useCallback((title: string, arg?: ToastArg) => toast.info(title, arg), []);
  const loading = useCallback((title: string, arg?: ToastArg) => toast.loading(title, arg), []);
  const dismiss = useCallback((id?: string) => toast.dismiss(id), []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, loading, dismiss }}>
      {children}
      {/* Floating Toast Viewport */}
      <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const config = toastConfig[item.type] || toastConfig.info;
            const Icon = config.icon;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                style={item.style}
                className={cn(
                  'pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-2xl p-4 transition-all',
                  config.bgColor,
                  config.borderColor,
                  config.glow,
                  item.className
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-1 rounded-lg bg-white/5 shrink-0 mt-0.5', config.iconColor)}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="text-xs font-bold text-white leading-tight">{item.title}</div>
                    {item.description && (
                      <div className="text-[11px] text-white/60 font-sans mt-1 leading-snug break-words">
                        {item.description}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeToast(item.id)}
                    className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      addToast: () => '',
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      loading: toast.loading,
      dismiss: toast.dismiss,
    };
  }
  return context;
};
