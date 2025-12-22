export interface OnboardingStep {
  title: string;
  description: string;
  children: React.ReactNode;
}

export interface OnboardingProps {
  title: string;
  description: string;
  steps: OnboardingStep[];
  currentStep: number;
  onStepComplete: (step: number) => void;
}

export interface StepProps extends OnboardingStep {
  stepNumber: number;
  isActive: boolean;
  isCompleted: boolean;
  onComplete: () => void;
}

export interface OnboardingContextValue {
  currentStep: number;
  totalSteps: number;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  completeOnboarding: () => Promise<void>;
}
