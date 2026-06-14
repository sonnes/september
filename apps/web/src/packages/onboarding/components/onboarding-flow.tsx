'use client';

import { ONBOARDING_PRIMARY_COPY, ONBOARDING_STEPS } from '../lib/onboarding-content';
import { useOnboarding } from './onboarding-provider';
import { ProfileStep } from './steps/profile';
import { SpeechStep } from './steps/speech';
import { SuggestionsStep } from './steps/suggestions';
import { WelcomeStep } from './steps/welcome';

export function OnboardingFlow() {
  const { currentStep, totalSteps, goToStep } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return <ProfileStep />;
      case 2:
        return <SpeechStep />;
      case 3:
        return <SuggestionsStep />;
      default:
        return null;
    }
  };

  return (
    <div className="grid min-h-dvh bg-zinc-100 p-0 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-3 md:p-3">
      <aside className="bg-primary p-6 text-primary-foreground md:rounded-xl md:p-7">
        <div className="flex items-center gap-3 font-bold">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15">
            S
          </div>
          <span>September</span>
        </div>

        <div className="mt-12 hidden md:block">
          <h1 className="text-3xl font-bold leading-tight tracking-normal">
            {ONBOARDING_PRIMARY_COPY.sidebar.title}
          </h1>
          <p className="mt-5 max-w-56 text-sm leading-relaxed text-primary-foreground/85">
            {ONBOARDING_PRIMARY_COPY.sidebar.description}
          </p>
        </div>

        <nav
          className="mt-6 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-1"
          aria-label="Onboarding progress"
        >
          {ONBOARDING_STEPS.map((step, i) => {
            const isCompleted = currentStep > i;
            const isCurrent = currentStep === i;
            const isClickable = isCompleted || isCurrent;
            return (
              <button
                key={step.label}
                type="button"
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${step.label}${isCurrent ? ' current' : isCompleted ? ' completed' : ''}`}
                onClick={() => isClickable && goToStep(i)}
                className={`grid min-h-20 grid-cols-[2.5rem_1fr] items-center gap-3 rounded-lg border p-3 text-left transition-all focus-visible:ring-[3px] focus-visible:ring-primary-foreground/50 disabled:opacity-100 ${
                  isCurrent
                    ? 'border-primary-foreground bg-primary-foreground text-primary'
                    : 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground'
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    isCurrent
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary-foreground/15 text-primary-foreground'
                  }`}
                >
                  {isCompleted ? 'OK' : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{step.label}</span>
                  <span className="mt-1 hidden text-xs opacity-75 sm:block">
                    {step.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="grid min-h-0 bg-background md:rounded-xl">
        <div className="mx-auto flex w-full max-w-4xl flex-col justify-center px-6 py-4 lg:py-8 lg:px-16">
          <div className="animate-in fade-in duration-200">{renderStep()}</div>
        </div>
      </main>
    </div>
  );
}
