'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAccountContext } from '@/packages/account';

const TOTAL_STEPS = 5;

export function useOnboardingLogic() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { updateAccount } = useAccountContext();

  const goToNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const completeOnboarding = useCallback(async () => {
    await updateAccount({ onboarding_completed: true });
    router.push('/talk');
  }, [updateAccount, router]);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    goToNextStep,
    goToPreviousStep,
    completeOnboarding,
  };
}
