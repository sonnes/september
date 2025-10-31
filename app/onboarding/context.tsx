'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import type {
  ApiKeysFormData,
  OnboardingFormData,
  OnboardingStep,
  SpeechFormData,
  SuggestionsFormData,
} from './onboarding-wizard';

/**
 * Onboarding Context
 *
 * Manages state for the entire onboarding wizard flow including:
 * - Current step navigation
 * - Completed steps tracking
 * - Form data collection across all steps
 */

interface OnboardingContextValue {
  // Navigation state
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;

  // Form data
  formData: OnboardingFormData;

  // Navigation actions
  goNext: () => void;
  goBack: () => void;
  goSkip: () => void;
  setCurrentStep: (step: OnboardingStep) => void;

  // Form data actions
  updateFormData: (stepData: Partial<OnboardingFormData>) => void;
  updateApiKeys: (apiKeys: Partial<ApiKeysFormData>) => void;
  updateSpeech: (speech: Partial<SpeechFormData>) => void;
  updateSuggestions: (suggestions: Partial<SuggestionsFormData>) => void;

  // Completion callback
  onComplete?: (formData: OnboardingFormData) => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Default initial form data
 */
const getInitialFormData = (): OnboardingFormData => ({
  apiKeys: {},
  speech: {
    provider: 'browser',
    settings: {
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },
  },
  suggestions: {
    enabled: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    settings: {
      temperature: 0.7,
      max_suggestions: 5,
      context_window: 10,
    },
  },
});

interface OnboardingProviderProps {
  children: React.ReactNode;
  initialStep?: OnboardingStep;
  initialFormData?: Partial<OnboardingFormData>;
  onComplete?: (formData: OnboardingFormData) => Promise<void>;
}

/**
 * OnboardingProvider Component
 *
 * Provides onboarding state and actions to all child components
 */
export function OnboardingProvider({
  children,
  initialStep = 'welcome',
  initialFormData,
  onComplete,
}: OnboardingProviderProps) {
  // Navigation state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());

  // Form data state
  const [formData, setFormData] = useState<OnboardingFormData>(() => ({
    ...getInitialFormData(),
    ...initialFormData,
  }));

  /**
   * Navigate to next step
   */
  const goNext = useCallback(() => {
    // Mark current step as completed
    setCompletedSteps(prev => new Set(prev).add(currentStep));

    // Determine next step
    const stepOrder: OnboardingStep[] = ['welcome', 'api-keys', 'speech', 'suggestions', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep) {
      setCurrentStep(nextStep);

      // If we reach complete, trigger onComplete callback
      if (nextStep === 'complete' && onComplete) {
        onComplete(formData);
      }
    }
  }, [currentStep, formData, onComplete]);

  /**
   * Navigate to previous step
   */
  const goBack = useCallback(() => {
    const stepOrder: OnboardingStep[] = ['welcome', 'api-keys', 'speech', 'suggestions', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const prevStep = stepOrder[currentIndex - 1];

    if (prevStep) {
      setCurrentStep(prevStep);
    }
  }, [currentStep]);

  /**
   * Skip current step (marks as completed and moves to next)
   */
  const goSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  /**
   * Update form data for any step
   */
  const updateFormData = useCallback((stepData: Partial<OnboardingFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...stepData,
    }));
  }, []);

  /**
   * Update API keys data
   */
  const updateApiKeys = useCallback((apiKeys: Partial<ApiKeysFormData>) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        ...apiKeys,
      },
    }));
  }, []);

  /**
   * Update speech settings data
   */
  const updateSpeech = useCallback((speech: Partial<SpeechFormData>) => {
    setFormData(prev => ({
      ...prev,
      speech: {
        ...prev.speech,
        ...speech,
        settings: {
          ...prev.speech.settings,
          ...speech.settings,
        },
      },
    }));
  }, []);

  /**
   * Update suggestions settings data
   */
  const updateSuggestions = useCallback((suggestions: Partial<SuggestionsFormData>) => {
    setFormData(prev => ({
      ...prev,
      suggestions: {
        ...prev.suggestions,
        ...suggestions,
        settings: {
          ...prev.suggestions.settings,
          ...suggestions.settings,
        },
      },
    }));
  }, []);

  const value: OnboardingContextValue = {
    // Navigation state
    currentStep,
    completedSteps,

    // Form data
    formData,

    // Navigation actions
    goNext,
    goBack,
    goSkip,
    setCurrentStep,

    // Form data actions
    updateFormData,
    updateApiKeys,
    updateSpeech,
    updateSuggestions,

    // Completion callback
    onComplete,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

/**
 * useOnboarding Hook
 *
 * Access onboarding state and actions from any child component
 *
 * @throws Error if used outside of OnboardingProvider
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}
