'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAccount } from '@/services/account/context';

interface OnboardingContextValue {
  currentStep: number;
  totalSteps: number;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const TOTAL_STEPS = 5;

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

  const completeOnboarding = useCallback(async () => {
    await updateAccount({ onboarding_completed: true });
    router.push('/talk');
  }, [updateAccount, router]);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        totalSteps: TOTAL_STEPS,
        goToNextStep,
        goToPreviousStep,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
