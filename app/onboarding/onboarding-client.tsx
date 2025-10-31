'use client';

import { useEffect, useState } from 'react';

import { useAccount } from '@/services/account';

import { OnboardingProvider } from './context';
import { OnboardingFormData, OnboardingStep, OnboardingWizard } from './onboarding-wizard';

/**
 * Parse the URL hash to get the current step
 */
function getStepFromHash(): OnboardingStep | undefined {
  if (typeof window === 'undefined') return undefined;

  const hash = window.location.hash.slice(1); // Remove the '#'
  const validSteps: OnboardingStep[] = ['welcome', 'api-keys', 'speech', 'suggestions', 'complete'];

  if (validSteps.includes(hash as OnboardingStep)) {
    return hash as OnboardingStep;
  }

  return undefined;
}

/**
 * Client-side onboarding component that manages state and handles completion
 */
export function OnboardingClient() {
  const { updateAccount } = useAccount();
  const [initialStep, setInitialStep] = useState<OnboardingStep>('welcome');

  /**
   * Read the URL hash on mount to determine the initial step
   */
  useEffect(() => {
    const stepFromHash = getStepFromHash();
    if (stepFromHash) {
      setInitialStep(stepFromHash);
    }
  }, []);

  /**
   * Handle onboarding completion
   * Updates the account to mark onboarding as complete and redirects to /talk
   */
  const handleComplete = async (formData: OnboardingFormData) => {
    try {
      // Update account with onboarding completion flag and form data
      await updateAccount({
        onboarding_completed: true,
        // Save form data to account settings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ai_providers: formData.apiKeys as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ai_speech: formData.speech as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ai_suggestions: formData.suggestions as any,
      });

      // Redirect to /talk
      // router.push('/talk');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Could show a toast notification here
    }
  };

  return (
    <OnboardingProvider initialStep={initialStep} onComplete={handleComplete}>
      <OnboardingWizard />
    </OnboardingProvider>
  );
}
