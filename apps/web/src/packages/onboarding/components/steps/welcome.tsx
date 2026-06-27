'use client';

import { Button } from '@/packages/ui/components/button';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

export function WelcomeStep() {
  const { goToNextStep } = useOnboarding();
  const copy = ONBOARDING_PRIMARY_COPY.welcome;

  return (
    <StepShell>
      <StepHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      <ol className="space-y-4 border-l border-border pl-5">
        {copy.path.map((item, index) => (
          <li key={item.title} className="relative">
            <span className="absolute -left-[1.8125rem] top-0 flex size-6 items-center justify-center rounded-full bg-background text-xs font-semibold text-primary ring-1 ring-border">
              {index + 1}
            </span>
            <div className="max-w-xl">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <StepFooter helper={copy.helper}>
        <Button size="lg" onClick={goToNextStep}>
          {copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
