'use client';

import { useOnboarding } from './context';
import ApiKeysStep from './steps/api-keys';
import Complete from './steps/complete';
import SpeechStep from './steps/speech';
import SuggestionsStep from './steps/suggestions';
import Welcome from './steps/welcome';

/**
 * Step identifier type for the onboarding wizard
 */
export type OnboardingStep = 'welcome' | 'api-keys' | 'speech' | 'suggestions' | 'complete';

/**
 * Form data for API Keys step
 */
export interface ApiKeysFormData {
  gemini_api_key?: string;
  gemini_base_url?: string;
  elevenlabs_api_key?: string;
  elevenlabs_base_url?: string;
  openai_api_key?: string;
  openai_base_url?: string;
  anthropic_api_key?: string;
  anthropic_base_url?: string;
  whisper_api_key?: string;
  whisper_base_url?: string;
  'assembly-ai_api_key'?: string;
  'assembly-ai_base_url'?: string;
}

/**
 * Form data for Speech step
 */
export interface SpeechFormData {
  provider: 'elevenlabs' | 'browser' | 'gemini';
  voice_id?: string;
  voice_name?: string;
  settings?: {
    // Browser TTS settings
    speed?: number;
    pitch?: number;
    volume?: number;
    // ElevenLabs settings
    model_id?: string;
    stability?: number;
    similarity?: number;
    style?: number;
    speaker_boost?: boolean;
    // Gemini settings
    voice_name?: string;
  };
}

/**
 * Form data for Suggestions step
 */
export interface SuggestionsFormData {
  enabled: boolean;
  provider: 'gemini';
  model?: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  settings?: {
    system_instructions?: string;
    temperature?: number;
    max_suggestions?: number;
    context_window?: number;
    ai_corpus?: string;
  };
}

/**
 * Complete form data collected during onboarding
 */
export interface OnboardingFormData {
  apiKeys: ApiKeysFormData;
  speech: SpeechFormData;
  suggestions: SuggestionsFormData;
}

/**
 * State for the onboarding wizard
 */
export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
  formData: OnboardingFormData;
}

/**
 * Progress indicator step information
 */
export interface ProgressStep {
  id: OnboardingStep;
  label: string;
  stepNumber: number;
}

const PROGRESS_STEPS: ProgressStep[] = [
  { id: 'api-keys', label: 'API Keys', stepNumber: 1 },
  { id: 'speech', label: 'Speech & Voice', stepNumber: 2 },
  { id: 'suggestions', label: 'Suggestions', stepNumber: 3 },
];

const TOTAL_STEPS = PROGRESS_STEPS.length;

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
}

/**
 * Progress Indicator Component
 * Shows visual progress through the onboarding steps
 */
function ProgressIndicator({ currentStep, completedSteps }: ProgressIndicatorProps) {
  const getCurrentStepNumber = () => {
    const step = PROGRESS_STEPS.find(s => s.id === currentStep);
    return step?.stepNumber ?? 0;
  };

  const getStepState = (stepId: OnboardingStep): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.has(stepId)) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'upcoming';
  };

  const currentStepNumber = getCurrentStepNumber();

  return (
    <div className="w-full bg-white border-b border-zinc-200 mb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step counter - mobile */}
        <div className="text-center mb-4 sm:hidden">
          <p className="text-sm font-medium text-zinc-600">
            Step {currentStepNumber} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative px-8">
          {/* Background line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-200" aria-hidden="true" />

          {/* Steps */}
          <div className="relative flex justify-between">
            {PROGRESS_STEPS.map(step => {
              const state = getStepState(step.id);

              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Step circle */}
                  <div
                    className={`
                      relative flex h-8 w-8 items-center justify-center rounded-full border-2
                      transition-colors duration-200
                      ${
                        state === 'completed'
                          ? 'border-green-600 bg-green-600'
                          : state === 'current'
                            ? 'border-indigo-600 bg-white'
                            : 'border-zinc-300 bg-white'
                      }
                    `}
                    aria-current={state === 'current' ? 'step' : undefined}
                  >
                    {state === 'completed' ? (
                      <svg
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span
                        className={`
                          text-sm font-medium
                          ${state === 'current' ? 'text-indigo-600' : 'text-zinc-500'}
                        `}
                      >
                        {step.stepNumber}
                      </span>
                    )}
                  </div>

                  {/* Step label - hidden on mobile */}
                  <span
                    className={`
                      mt-2 text-xs sm:text-sm font-medium hidden sm:block text-center whitespace-nowrap
                      ${
                        state === 'completed'
                          ? 'text-green-600'
                          : state === 'current'
                            ? 'text-indigo-600'
                            : 'text-zinc-500'
                      }
                    `}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OnboardingWizard Component
 * Renders the onboarding flow using state from OnboardingProvider
 */
export function OnboardingWizard() {
  // Get state and actions from context
  const { currentStep, completedSteps } = useOnboarding();

  // Show progress indicator for main steps (not welcome or complete)
  const showProgressIndicator = !['welcome', 'complete'].includes(currentStep);

  return (
    <div>
      {/* Progress Indicator */}
      {showProgressIndicator && (
        <ProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />
      )}

      {/* Step Content */}
      <div className="max-w-5xl mx-auto py-8">
        {currentStep === 'welcome' && <Welcome />}

        {currentStep === 'api-keys' && <ApiKeysStep />}

        {currentStep === 'speech' && <SpeechStep />}

        {currentStep === 'suggestions' && <SuggestionsStep />}

        {currentStep === 'complete' && <Complete />}
      </div>
    </div>
  );
}
