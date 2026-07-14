'use client';

import type { ReactNode } from 'react';

import { cn } from '@/packages/shared';

import type { SetupModeAccent } from '../lib/setup-modes';

// One place for the setup-mode accent colors (the sanctioned hard-coded shades,
// like Callout's tones) — used by the onboarding mode step and Settings → Setup.
const ACCENT_BADGE: Record<SetupModeAccent, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
};

export function ModeBadge({
  accent,
  className,
  children,
}: {
  accent: SetupModeAccent;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold',
        ACCENT_BADGE[accent],
        className
      )}
    >
      {children}
    </span>
  );
}
