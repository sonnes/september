'use client';

import { Progress } from '@/components/ui/progress';

import { useOnboarding } from '@/packages/onboarding/components/onboarding-provider';
import { AIProvidersStep } from '@/packages/onboarding/components/steps/ai-providers';
import { CompleteStep } from '@/packages/onboarding/components/steps/complete';
import { SpeechStep } from '@/packages/onboarding/components/steps/speech';
import { SuggestionsStep } from '@/packages/onboarding/components/steps/suggestions';
import { WelcomeStep } from '@/packages/onboarding/components/steps/welcome';

export function OnboardingFlow() {
  const { currentStep, totalSteps } = useOnboarding();

  const progress = ((currentStep + 1) / totalSteps) * 100;

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
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {renderStep()}
    </div>
  );
}

