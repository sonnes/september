'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAccount } from '@/services/account';
import { AI_PROVIDERS } from '@/services/ai/registry';
import {
  DEFAULT_SPEECH_CONFIG,
  DEFAULT_SUGGESTIONS_CONFIG,
} from '@/services/ai/defaults';

import type { Account } from '@/types/account';
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
 * Get providers that require API keys
 */
const getProvidersWithApiKeys = () => {
  return Object.values(AI_PROVIDERS).filter(provider => provider.requires_api_key);
};

/**
 * Load initial form data from account (if available)
 * This allows users to see their existing settings when going through onboarding
 */
const getInitialFormData = (account: Account | null): OnboardingFormData => {
  // Load API keys from account
  const apiKeys: ApiKeysFormData = {};

  if (account?.ai_providers) {
    getProvidersWithApiKeys().forEach(provider => {
      const providerId = provider.id as keyof typeof account.ai_providers;
      const providerConfig = account.ai_providers?.[providerId];

      if (providerConfig) {
        const apiKeyField = `${provider.id}_api_key`;
        const baseUrlField = `${provider.id}_base_url`;

        apiKeys[apiKeyField as keyof ApiKeysFormData] = providerConfig.api_key || '';
        apiKeys[baseUrlField as keyof ApiKeysFormData] = providerConfig.base_url || '';
      }
    });
  }

  // Load speech settings from account
  const speech: SpeechFormData = account?.ai_speech
    ? {
        ...DEFAULT_SPEECH_CONFIG,
        ...account.ai_speech,
        settings: {
          ...DEFAULT_SPEECH_CONFIG.settings,
          ...account.ai_speech.settings,
        },
      }
    : DEFAULT_SPEECH_CONFIG;

  // Load suggestions settings from account
  const suggestions: SuggestionsFormData = account?.ai_suggestions
    ? {
        enabled: account.ai_suggestions.enabled ?? true,
        provider: account.ai_suggestions.provider || DEFAULT_SUGGESTIONS_CONFIG.provider,
        model: (account.ai_suggestions.model as 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro') ||
               (DEFAULT_SUGGESTIONS_CONFIG.model as 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'),
        settings: {
          ...DEFAULT_SUGGESTIONS_CONFIG.settings,
          ...account.ai_suggestions.settings,
        },
      }
    : {
        ...DEFAULT_SUGGESTIONS_CONFIG,
        enabled: true, // Default to enabled for onboarding
        model: DEFAULT_SUGGESTIONS_CONFIG.model as 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro',
      };

  return {
    apiKeys,
    speech,
    suggestions,
  };
};

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
  // Get account data to load existing settings
  const { account } = useAccount();

  // Navigation state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());

  // Form data state - memoize to prevent unnecessary recalculations
  const initialData = useMemo(() => {
    return {
      ...getInitialFormData(account),
      ...initialFormData,
    };
  }, [account, initialFormData]);

  const [formData, setFormData] = useState<OnboardingFormData>(initialData);

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
