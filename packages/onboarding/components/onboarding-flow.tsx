'use client';

import { useOnboarding } from './onboarding-provider';
import { AIProvidersStep } from './steps/ai-providers';
import { CompleteStep } from './steps/complete';
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
        return <AIProvidersStep />;
      case 2:
        return <SuggestionsStep />;
      case 3:
        return <SpeechStep />;
      case 4:
        return <CompleteStep />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-screen w-full justify-center overflow-y-auto bg-background pt-16 pb-12">
      {/* Subtle radial indigo glow behind the flow. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(79, 70, 229, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.05) 0%, transparent 50%)',
        }}
      />

      <div className="relative flex w-full max-w-2xl flex-col items-center">
        <div className="mb-12 flex items-center gap-3">
          {Array.from({ length: totalSteps }, (_, i) => {
            const isCompleted = currentStep > i;
            const isCurrent = currentStep === i;
            const isClickable = isCompleted || isCurrent;
            return (
              <div key={i} className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && goToStep(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : isCompleted
                        ? 'cursor-pointer bg-emerald-500 text-white hover:opacity-80'
                        : 'cursor-default bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </button>
                {i < totalSteps - 1 && (
                  <div
                    className={`h-0.5 w-6 transition-all ${
                      currentStep > i ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="w-full animate-in fade-in duration-200">{renderStep()}</div>
      </div>
    </div>
  );
}
