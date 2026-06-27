'use client';

import { ReactNode, createContext, useCallback, useContext, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';

import { ONBOARDING_STEPS } from '../lib/onboarding-content';
import { type SetupMode, isSetupMode } from '../lib/setup-modes';
import type { OnboardingContextValue } from '../types';

const TOTAL_STEPS = ONBOARDING_STEPS.length;

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

function readSearch() {
  if (typeof window === 'undefined') return { step: null as number | null, mode: null as SetupMode | null };
  const params = new URLSearchParams(window.location.search);
  const requestedStep = Number(params.get('step'));
  const step =
    Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= TOTAL_STEPS
      ? requestedStep - 1
      : null;
  const rawMode = params.get('mode');
  return { step, mode: isSetupMode(rawMode) ? rawMode : null };
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  // Both step and mode are seeded from the URL so the OpenRouter OAuth
  // full-page redirect (back to `/onboarding?step=4&mode=…`) restores the
  // right finish branch.
  const initial = readSearch();
  const [currentStep, setCurrentStep] = useState(() => initial.step ?? 0);
  const [mode, setModeState] = useState<SetupMode | null>(() => initial.mode);
  const navigate = useNavigate();
  const { updateAccount } = useAccount();

  const setMode = useCallback((next: SetupMode) => setModeState(next), []);

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
    navigate({ to: '/talk' });
  }, [updateAccount, navigate]);

  const value: OnboardingContextValue = {
    currentStep,
    totalSteps: TOTAL_STEPS,
    mode,
    setMode,
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
