'use client';

import { useRef } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/packages/shared';

export interface ModeOption<T extends string = string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

interface ModeGroupProps<T extends string> {
  modes: ModeOption<T>[];
  value: T;
  onChange: (mode: T) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Segmented mode switch rendered as a `tablist` with roving tabindex: only the
 * active tab is in the tab order, arrow keys move focus between tabs, and
 * Enter/Space (or click) activates the focused one. Data-driven so a third mode
 * (Agent) slots in without touching this component.
 */
export function ModeGroup<T extends string>({
  modes,
  value,
  onChange,
  className,
  ariaLabel = 'Space mode',
}: ModeGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      refs.current[(index + 1) % modes.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      refs.current[(index - 1 + modes.length) % modes.length]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(modes[index].key);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-0.5 rounded-full border bg-card p-0.5', className)}
    >
      {modes.map((mode, index) => {
        const active = mode.key === value;
        const Icon = mode.icon;
        return (
          <button
            key={mode.key}
            ref={el => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(mode.key)}
            onKeyDown={e => handleKeyDown(e, index)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
