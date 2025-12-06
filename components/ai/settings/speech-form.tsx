'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { Control, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox, FormDropdown, FormRangeWithLabels } from '@/components/uix/form';

import { useAISettings } from '@/services/ai/context';
import { getModelsForProvider, getProvidersForFeature } from '@/services/ai/registry';

import type { AIProvider } from '@/types/ai-config';

/**
 * Zod schema for Speech Configuration
 */
export const SpeechFormSchema = z.object({
  provider: z.enum(['elevenlabs', 'browser', 'gemini']),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  settings: z
    .object({
      // Browser TTS settings
      speed: z.number().min(0.1).max(10).optional(),
      pitch: z.number().min(-20).max(20).optional(),
      volume: z.number().min(0).max(1).optional(),
      // ElevenLabs settings
      model_id: z.string().optional(),
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      speaker_boost: z.boolean().optional(),
      // Gemini settings
      voice_name: z.string().optional(),
    })
    .optional(),
});

export type SpeechFormData = z.infer<typeof SpeechFormSchema>;

// Get speech providers from registry
const getSpeechProviders = () => {
  return getProvidersForFeature('speech').map(provider => ({
    id: provider.id,
    name: provider.name,
  }));
};

// Get models for a specific provider from registry
const getProviderModels = (providerId: string) => {
  return getModelsForProvider(providerId as AIProvider).map(model => ({
    id: model.id,
    name: model.name,
  }));
};

interface SpeechFormProps {
  control: Control<SpeechFormData>;
}

export function SpeechForm({ control }: SpeechFormProps) {
  const { getProviderConfig } = useAISettings();

  const provider = useWatch({ control, name: 'provider' });
  const selectedVoiceId = useWatch({ control, name: 'voice_id' });
  const selectedVoiceName = useWatch({ control, name: 'voice_name' });

  // Provider instance not needed here; defer to services when generating speech

  // Get the appropriate API key based on provider
  const apiKey = useMemo(() => {
    return getProviderConfig(provider as AIProvider)?.api_key;
  }, [provider, getProviderConfig]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Provider Selection */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Speech Provider</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Choose between browser text-to-speech (free) or ElevenLabs (high quality, requires API
            key).
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormDropdown
            name="provider"
            control={control}
            label="Provider"
            options={getSpeechProviders()}
          />

          {!apiKey && (
            <div className="mt-4 rounded-md bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong>API Key Required:</strong> You need to configure your speech provider API
                key in{' '}
                <a href="/settings/ai" className="underline hover:text-amber-900">
                  AI Settings
                </a>{' '}
                to use speech generation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Current Voice */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Voice</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Your currently selected voice for text-to-speech generation.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-4">
            {selectedVoiceName ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{selectedVoiceName}</p>
                  {selectedVoiceId && (
                    <p className="text-xs text-zinc-500 mt-1">ID: {selectedVoiceId}</p>
                  )}
                </div>
                <Link
                  href="/voices"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Change voice →
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">No voice selected</p>
                <Link
                  href="/voices"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Select voice →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Provider-Specific Settings */}
      {provider === 'browser' && (
        <div className="border-t border-zinc-200 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-base/7 font-semibold text-zinc-900">Browser TTS Settings</h3>
            <p className="mt-1 text-sm/6 text-zinc-600">
              Customize the speech synthesis settings for browser text-to-speech.
            </p>
          </div>

          <div className="space-y-6">
            {/* Speed */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Speed</h4>
                <p className="mt-1 text-sm text-zinc-600">Controls how fast the voice speaks.</p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.speed"
                  control={control}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  leftLabel="Slower"
                  rightLabel="Faster"
                  showValue
                  valueFormatter={value => `${value}x`}
                />
              </div>
            </div>

            {/* Pitch */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Pitch</h4>
                <p className="mt-1 text-sm text-zinc-600">Controls the pitch of the voice.</p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.pitch"
                  control={control}
                  min={-20}
                  max={20}
                  step={1}
                  leftLabel="Lower"
                  rightLabel="Higher"
                  showValue
                  valueFormatter={value => value.toString()}
                />
              </div>
            </div>

            {/* Volume */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Volume</h4>
                <p className="mt-1 text-sm text-zinc-600">Controls the volume of the voice.</p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.volume"
                  control={control}
                  min={0}
                  max={1}
                  step={0.1}
                  leftLabel="Quieter"
                  rightLabel="Louder"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {provider === 'elevenlabs' && (
        <div className="border-t border-zinc-200 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-base/7 font-semibold text-zinc-900">ElevenLabs Settings</h3>
            <p className="mt-1 text-sm/6 text-zinc-600">
              Fine-tune voice characteristics for ElevenLabs text-to-speech.
            </p>
          </div>

          <div className="space-y-6">
            {/* Model Selection */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Model</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Choose the ElevenLabs model for speech generation.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormDropdown
                  name="settings.model_id"
                  control={control}
                  label="Model"
                  options={getProviderModels('elevenlabs')}
                  placeholder="Select a model"
                />
              </div>
            </div>

            {/* Speed */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Speed</h4>
                <p className="mt-1 text-sm text-zinc-600">Controls how fast the voice speaks.</p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.speed"
                  control={control}
                  min={0.7}
                  max={1.2}
                  step={0.1}
                  leftLabel="Slower"
                  rightLabel="Faster"
                  showValue
                  valueFormatter={value => `${value}x`}
                />
              </div>
            </div>

            {/* Stability */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Stability</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Higher values make the voice more stable and consistent.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.stability"
                  control={control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="More Variable"
                  rightLabel="More Stable"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                />
              </div>
            </div>

            {/* Similarity */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Similarity</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Enhances similarity to the original voice at the cost of some clarity.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.similarity"
                  control={control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="Low"
                  rightLabel="High"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                />
              </div>
            </div>

            {/* Style Exaggeration */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Style Exaggeration</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Controls how much the voice style is exaggerated.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormRangeWithLabels
                  name="settings.style"
                  control={control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="None"
                  rightLabel="Exaggerated"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                />
              </div>
            </div>

            {/* Speaker Boost */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Speaker Boost</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Enhance speaker clarity and reduce background noise.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormCheckbox
                  name="settings.speaker_boost"
                  control={control}
                  label="Enable speaker boost"
                  description="Enhance speaker clarity and reduce background noise"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {provider === 'gemini' && (
        <div className="border-t border-zinc-200 pt-6">
          <div className="px-4 mb-4">
            <h3 className="text-base/7 font-semibold text-zinc-900">Gemini Speech Settings</h3>
            <p className="mt-1 text-sm/6 text-zinc-600">
              Configure the settings for Gemini speech generation.
            </p>
          </div>

          <div className="space-y-6">
            {/* Model Selection */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
              <div className="px-4 sm:px-0">
                <h4 className="text-sm font-medium text-zinc-900">Model</h4>
                <p className="mt-1 text-sm text-zinc-600">
                  Choose the Gemini model for speech generation.
                </p>
              </div>
              <div className="md:col-span-2 px-4">
                <FormDropdown
                  name="settings.model_id"
                  control={control}
                  label="Model"
                  options={getProviderModels('gemini')}
                  placeholder="Select a model"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
