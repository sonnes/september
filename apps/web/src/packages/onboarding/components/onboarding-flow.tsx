'use client';

import { Check } from 'lucide-react';

import { ONBOARDING_PRIMARY_COPY, ONBOARDING_STEPS } from '../lib/onboarding-content';
import { useOnboarding } from './onboarding-provider';
import { AdvancedFinishStep } from './steps/finish-advanced';
import { FreeFinishStep } from './steps/finish-free';
import { PrivacyFinishStep } from './steps/finish-privacy';
import { ModeStep } from './steps/mode';
import { ProfileStep } from './steps/profile';
import { WelcomeStep } from './steps/welcome';

export function OnboardingFlow() {
  const { currentStep, mode, goToStep } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <ProfileStep />;
      case 2:
        return <ModeStep />;
      case 3:
        // The chosen mode drives the final step. If somehow reached without a
        // mode (e.g. a hand-edited URL), fall back to the mode chooser.
        if (mode === 'privacy') return <PrivacyFinishStep />;
        if (mode === 'free') return <FreeFinishStep />;
        if (mode === 'advanced') return <AdvancedFinishStep />;
        return <ModeStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-100 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="rounded-xl bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex items-center gap-2 font-bold">
            <img src="/logo.png" alt="September Logo" width={40} height={40} className="h-10 w-10" />
            <span className="text-xl">september</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
            {ONBOARDING_PRIMARY_COPY.sidebar.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
            {ONBOARDING_PRIMARY_COPY.sidebar.description}
          </p>
        </header>

        <main className="mt-4 rounded-xl bg-background p-6 shadow-sm sm:p-10">
          <nav aria-label="Onboarding progress" className="mb-8 lg:mb-10">
            <ol className="flex items-center">
              {ONBOARDING_STEPS.map((step, i) => {
                const isCompleted = currentStep > i;
                const isCurrent = currentStep === i;
                const isClickable = isCompleted || isCurrent;
                const isLast = i === ONBOARDING_STEPS.length - 1;
                return (
                  <li
                    key={step.label}
                    className={`flex items-center ${isLast ? '' : 'flex-1'}`}
                  >
                    <button
                      type="button"
                      disabled={!isClickable}
                      aria-current={isCurrent ? 'step' : undefined}
                      aria-label={`Step ${i + 1}: ${step.label}${isCurrent ? ' current' : isCompleted ? ' completed' : ''}`}
                      onClick={() => isClickable && goToStep(i)}
                      className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default"
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                          isCurrent
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? <Check className="size-4" /> : i + 1}
                      </span>
                      <span
                        className={`hidden text-sm font-semibold sm:block ${
                          isCurrent
                            ? 'text-foreground'
                            : isCompleted
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`mx-3 h-px flex-1 ${isCompleted ? 'bg-primary' : 'bg-border'}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="animate-in fade-in duration-200">{renderStep()}</div>
        </main>
      </div>
    </div>
  );
}
