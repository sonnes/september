'use client';

import type { ReactNode } from 'react';

import { ArrowLeft } from 'lucide-react';

import { Button } from '@september/ui/components/button';

// Shared step chrome for the onboarding setup flow. Each step composes
// StepShell > StepHeader + body + StepFooter for a consistent eyebrow → hero →
// subtitle header and a bottom action bar. Back lives in the header as an icon.

export function StepShell({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-10 px-2 py-10 sm:px-8 sm:py-12">{children}</div>;
}

interface StepHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
}

export function StepHeader({ eyebrow, title, subtitle, onBack, backDisabled }: StepHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        {eyebrow && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </span>
        )}
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-normal sm:text-[36px]">
          {title}
        </h1>
        {subtitle && <p className="max-w-prose text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onBack}
          className="shrink-0"
          disabled={backDisabled}
          title="Go back"
        >
          <ArrowLeft className="size-4" />
        </Button>
      )}
    </div>
  );
}

interface StepFooterProps {
  helper?: ReactNode;
  children: ReactNode;
}

export function StepFooter({ helper, children }: StepFooterProps) {
  return (
    <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{helper}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}
