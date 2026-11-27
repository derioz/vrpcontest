/**
 * The admin switch: a gradient track with a soft halo when on, and a knob that
 * springs across and turns its cross into a check. Styling lives in controls.css.
 */
import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import './controls.css';

interface AnimatedSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** `danger` turns the track red, for switches that lock or remove things. */
  tone?: 'accent' | 'danger';
  size?: 'sm' | 'md';
  ariaLabel: string;
  className?: string;
}

export function AnimatedSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  tone = 'accent',
  size = 'sm',
  ariaLabel,
  className,
}: AnimatedSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-size={size}
      data-tone={tone}
      onClick={() => onCheckedChange(!checked)}
      className={cn('pretty-switch', className)}
    >
      <span className="pretty-switch-knob" aria-hidden="true">
        <X className="is-off" strokeWidth={3.5} />
        <Check className="is-on" strokeWidth={4} />
      </span>
    </button>
  );
}

export default AnimatedSwitch;
