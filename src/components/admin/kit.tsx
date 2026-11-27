/**
 * The admin console's shared building blocks. One surface step, one border,
 * one accent: orange marks the primary action and the current selection.
 */
import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AnimatedSwitch } from '../ui/animated-switch';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold font-display tracking-tight text-white">{title}</h1>
        {description && <p className="mt-0.5 max-w-2xl text-sm text-white/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  key?: React.Key;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-white/10 bg-[#0c0c10]', className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-white/60">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** A labelled line with its control on the right. Stack several inside a Panel. */
export function Row({
  label,
  description,
  children,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 last:border-b-0', className)}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {description && <div className="mt-0.5 max-w-xl text-xs leading-relaxed text-white/60">{description}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }
>(({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    data-btn={variant}
    className={cn(
      'inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold',
      size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  tone = 'accent',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: 'accent' | 'danger';
}) {
  return <AnimatedSwitch checked={checked} onCheckedChange={onChange} ariaLabel={label} disabled={disabled} tone={tone} />;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          data-segment
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 cursor-pointer whitespace-nowrap rounded px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-fivem-orange',
            value === o.value ? 'text-white' : 'text-white/60 hover:text-white',
          )}
        >
          {o.label}{o.count !== undefined && ' '}
          {o.count !== undefined && <span className="ml-1.5 tabular-nums text-white/50">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const fieldClass =
  'h-9 rounded-md border border-white/15 bg-[#09090d] px-3 text-sm text-white placeholder:text-white/45 focus:border-fivem-orange focus:outline-none';

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(fieldClass, 'w-full pl-9')}
      />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-white/80">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/55">{children}</p>}
    </div>
  );
}
