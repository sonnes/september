'use client';

import { ReactNode, createContext, useContext } from 'react';

import { useOnboardingLogic } from '@/packages/onboarding/hooks/use-onboarding';
import { OnboardingContextValue } from '@/packages/onboarding/types';

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const onboardingLogic = useOnboardingLogic();

  return (
    <OnboardingContext.Provider value={onboardingLogic}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
