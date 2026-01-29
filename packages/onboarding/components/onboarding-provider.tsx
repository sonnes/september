'use client';

import { ReactNode, createContext, useContext } from 'react';

import { useOnboardingLogic } from '@september/onboarding/hooks/use-onboarding';
import { OnboardingContextValue } from '@september/onboarding/types';

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
