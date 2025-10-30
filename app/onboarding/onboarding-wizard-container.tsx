'use client';

import { useRouter } from 'next/navigation';

import { useAccount } from '@/services/account';

import { OnboardingFormData, OnboardingWizard } from './onboarding-wizard';

/**
 * Container component that handles the onboarding wizard integration
 * and provides the completion handler
 */
export function OnboardingWizardContainer() {
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
    <OnboardingWizard
      onComplete={handleComplete}
      // You can optionally pass initialStep and initialFormData
      // for resuming partial onboarding
    />
  );
}
