'use client';

import { Button } from '@september/ui/components/button';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

export function WelcomeStep() {
  const { goToNextStep } = useOnboarding();
  const copy = ONBOARDING_PRIMARY_COPY.welcome;

  return (
    <StepShell>
      <StepHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

      <section aria-labelledby="onboarding-default-path" className="space-y-5">
        <div>
          <h2 id="onboarding-default-path" className="text-sm font-semibold text-primary">
            Recommended path
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Start with what already works. You can add more later.
          </p>
        </div>

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
      </section>

      <section aria-labelledby="onboarding-real-conversations" className="space-y-4">
        <div>
          <h2 id="onboarding-real-conversations" className="text-sm font-semibold">
            September helps with real conversations
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Short phrases stay ready when typing takes time.
          </p>
        </div>

        <div className="space-y-3 border-l border-primary/30 pl-5">
          {copy.examples.map(example => (
            <p key={example} className="text-sm leading-relaxed text-foreground">
              {example}
            </p>
          ))}
        </div>
      </section>

      <p className="border-l border-border pl-5 text-sm leading-relaxed text-muted-foreground">
        No technical setup is required to start communicating.
      </p>

      <StepFooter helper={copy.helper}>
        <Button size="lg" onClick={goToNextStep}>
          {copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
