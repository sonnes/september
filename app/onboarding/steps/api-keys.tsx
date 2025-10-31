'use client';

import { useMemo } from 'react';

import { APIKeysForm, type APIKeysFormData } from '@/components/settings';

import { useOnboarding } from '../context';
import type { ApiKeysFormData } from '../onboarding-wizard';

/**
 * API Keys Step Component
 *
 * Collects API keys for AI providers (Gemini, ElevenLabs, etc.)
 * Users can skip this step if they want to set up later.
 */

export default function ApiKeysStep() {
  const { formData, updateApiKeys, goNext, goBack, goSkip } = useOnboarding();

  // Initialize form with existing data from context
  const defaultValues = useMemo(() => {
    return formData.apiKeys as Partial<APIKeysFormData>;
  }, [formData.apiKeys]);

  const handleSubmit = async (data: APIKeysFormData) => {
    // Update context with API keys data
    updateApiKeys(data as ApiKeysFormData);
    // Navigate to next step
    goNext();
  };

  const handleSkip = () => {
    goSkip();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">
          Connect Your AI Providers
        </h2>
        <p className="text-zinc-600 text-lg">
          Enter your API keys to unlock AI-powered features. You can skip this step and add them
          later in settings.
        </p>
      </div>

      {/* Reusable API Keys Form */}
      <APIKeysForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        variant="compact"
        showActionButtons={true}
        onBack={goBack}
        onSkip={handleSkip}
        submitButtonText="Continue"
      />
    </div>
  );
}
