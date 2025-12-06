'use client';

import { useMemo, useState } from 'react';

import { Control, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox, FormDropdown } from '@/components/uix/form';

import { useAISettings } from '@/services/ai/context';
import { getModelsForProvider } from '@/services/ai/registry';

import { AIProvider } from '@/types/ai-config';

/**
 * Zod schema for Transcription Configuration
 */
export const TranscriptionFormSchema = z.object({
  enabled: z.boolean(),
  provider: z.literal('gemini'),
  model: z.enum(['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']),
  settings: z
    .object({
      language: z.string().optional(),
      detect_language: z.boolean().optional(),
      include_timestamps: z.boolean().optional(),
      filter_profanity: z.boolean().optional(),
    })
    .optional(),
});

export type TranscriptionFormData = z.infer<typeof TranscriptionFormSchema>;

interface TranscriptionFormProps {
  control: Control<TranscriptionFormData>;
  watch: UseFormWatch<TranscriptionFormData>;
}

export function TranscriptionForm({ control, watch }: TranscriptionFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { getProviderConfig } = useAISettings();
  const provider = watch('provider');

  const models = useMemo(() => getModelsForProvider(provider as AIProvider), [provider]);
  const apiKey = getProviderConfig(provider as AIProvider)?.api_key;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* API Key Warning */}
      {!apiKey && (
        <div className="rounded-md bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>API Key Required:</strong> You need to configure your Gemini API key in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Settings
            </a>{' '}
            to use speech-to-text transcription.
          </p>
        </div>
      )}

      {/* Enable Toggle */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">
            Enable Speech-to-Text Transcription
          </h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Turn on AI-powered transcription to convert your speech into text automatically.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormCheckbox
            name="enabled"
            control={control}
            label="Enable Transcription"
            description="Automatically convert spoken words to text"
            disabled={!apiKey}
          />
        </div>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Model Selection</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Choose the AI model to use for transcription. Lite is fastest, Pro is most accurate.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormDropdown
            name="model"
            control={control}
            label="Gemini Model"
            options={models.map(model => ({ id: model.id, name: model.name }))}
            disabled={!apiKey}
          />
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <div className="border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between px-4 text-left"
        >
          <h3 className="text-base/7 font-semibold text-zinc-900">Advanced Settings</h3>
          <svg
            className={`h-5 w-5 text-zinc-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Auto-detect Language */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Language Detection</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Automatically detect the language being spoken.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormCheckbox
                  name="settings.detect_language"
                  control={control}
                  label="Auto-detect Language"
                  description="Automatically identify the language in audio"
                />
              </div>
            </div>

            {/* Include Timestamps */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Timestamps</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Include timestamps in the transcription output.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormCheckbox
                  name="settings.include_timestamps"
                  control={control}
                  label="Include Timestamps"
                  description="Add timing information to transcribed text"
                />
              </div>
            </div>

            {/* Filter Profanity */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Content Filtering</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Filter profanity and inappropriate language from transcriptions.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormCheckbox
                  name="settings.filter_profanity"
                  control={control}
                  label="Filter Profanity"
                  description="Remove inappropriate language from transcriptions"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
