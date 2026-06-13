'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAccount } from '@september/account';

import type { OnboardingContextValue } from '../types';

const TOTAL_STEPS = 5;

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { updateAccount } = useAccount();

  const goToNextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  // Step circles can only jump back to a reached step. currentStep is always
  // the furthest reached, since forward motion only happens via goToNextStep.
  const goToStep = useCallback((step: number) => {
    setCurrentStep(prev => (step >= 0 && step <= prev ? step : prev));
  }, []);

  const completeOnboarding = useCallback(async () => {
    await updateAccount({ onboarding_completed: true });
    router.push('/talk');
  }, [updateAccount, router]);

  const value: OnboardingContextValue = {
    currentStep,
    totalSteps: TOTAL_STEPS,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    completeOnboarding,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
