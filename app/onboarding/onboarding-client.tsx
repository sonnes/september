'use client';

import { useRouter } from 'next/navigation';

import { useAccount } from '@/services/account';

import { OnboardingProvider } from './context';
import { OnboardingFormData, OnboardingWizard } from './onboarding-wizard';

/**
 * Client-side onboarding component that manages state and handles completion
 */
export function OnboardingClient() {
  const router = useRouter();
  const { updateAccount } = useAccount();

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
      router.push('/talk');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Could show a toast notification here
    }
  };

  return (
    <OnboardingProvider onComplete={handleComplete}>
      <OnboardingWizard />
    </OnboardingProvider>
  );
}
