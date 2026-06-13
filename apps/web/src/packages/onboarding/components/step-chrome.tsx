'use client';

import type { ReactNode } from 'react';

import { Button } from '@september/ui/components/button';
import { ArrowLeft } from 'lucide-react';

export function StepShell({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-9 py-8 md:py-12">{children}</div>;
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
        {eyebrow && <span className="text-xs font-semibold text-muted-foreground">{eyebrow}</span>}
        <h1 className="text-3xl font-bold leading-tight tracking-normal md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {subtitle}
          </p>
        )}
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
