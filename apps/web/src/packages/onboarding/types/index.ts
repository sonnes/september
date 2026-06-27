import type { SetupMode } from '../lib/setup-modes';

export interface OnboardingContextValue {
  currentStep: number;
  totalSteps: number;
  mode: SetupMode | null;
  setMode: (mode: SetupMode) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => Promise<void>;
}
