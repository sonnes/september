'use client';

import { Check } from 'lucide-react';

import { Button } from '@/packages/ui/components/button';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { SETUP_MODES, type SetupModeAccent } from '../../lib/setup-modes';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

const ACCENT: Record<SetupModeAccent, { edge: string; badge: string }> = {
  emerald: { edge: 'border-t-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  amber: { edge: 'border-t-amber-600', badge: 'bg-amber-100 text-amber-700' },
  sky: { edge: 'border-t-sky-600', badge: 'bg-sky-100 text-sky-700' },
};

export function ModeStep() {
  const { mode, setMode, goToNextStep, goToPreviousStep } = useOnboarding();
  const copy = ONBOARDING_PRIMARY_COPY.mode;

  return (
    <StepShell>
      <StepHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        onBack={goToPreviousStep}
      />

      <fieldset className="grid gap-4 lg:grid-cols-3">
        <legend className="sr-only">Setup mode</legend>
        {SETUP_MODES.map(option => {
          const isSelected = mode === option.id;
          const accent = ACCENT[option.accent];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setMode(option.id)}
              className={`relative grid content-start gap-4 rounded-xl border border-t-4 bg-card p-6 text-left shadow-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${accent.edge} ${
                isSelected
                  ? 'border-primary ring-[3px] ring-ring/40'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span
                className={`absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border ${
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {isSelected && <Check className="size-3" />}
              </span>

              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${accent.badge}`}>
                {option.badge}
              </span>
              <span className="text-lg font-semibold text-foreground">{option.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{option.body}</span>
              <ul className="grid gap-3 text-sm leading-relaxed text-muted-foreground">
                {option.bullets.map(bullet => (
                  <li key={bullet} className="grid grid-cols-[8px_minmax(0,1fr)] gap-3">
                    <span className="mt-2 size-2 rounded-full bg-current" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </fieldset>

      <StepFooter helper={copy.helper}>
        <Button size="lg" onClick={goToNextStep} disabled={!mode}>
          {copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
