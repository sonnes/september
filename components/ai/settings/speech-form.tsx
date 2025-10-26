'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Control, UseFormSetValue, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox, FormDropdown, FormRangeWithLabels } from '@/components/ui/form';
import VoicesList from '@/components/voices/voices-list';

import { useToast } from '@/hooks/use-toast';

import { useSpeechContext } from '@/services/speech/context';

import type { Voice } from '@/types/voice';

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

const SPEECH_PROVIDERS = [
  { id: 'browser', name: 'Browser TTS (Free, No API Key)' },
  { id: 'elevenlabs', name: 'ElevenLabs (High Quality, Requires API Key)' },
  { id: 'gemini', name: 'Gemini Speech (Google AI, Requires API Key)' },
];

const ELEVENLABS_MODELS = [
  { id: 'eleven_v3', name: 'Eleven v3' },
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash Preview TTS' },
  { id: 'gemini-2.5-pro-preview-tts', name: 'Gemini 2.5 Pro Preview TTS' },
];

interface SpeechFormProps {
  control: Control<SpeechFormData>;
  setValue: UseFormSetValue<SpeechFormData>;
  getValues: (name?: string) => any;
  hasElevenLabsApiKey: boolean;
  hasGeminiApiKey?: boolean;
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
}

export function SpeechForm({
  control,
  setValue,
  getValues,
  hasElevenLabsApiKey,
  hasGeminiApiKey,
  elevenLabsApiKey,
  geminiApiKey,
}: SpeechFormProps) {
  const { showError } = useToast();
  const { getProvider } = useSpeechContext();

  // Voice state management
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const provider = useWatch({ control, name: 'provider' });
  const selectedVoiceId = useWatch({ control, name: 'voice_id' });

  // Get the provider instance
  const providerInstance = useMemo(() => {
    if (!provider) {
      return null;
    }
    return getProvider(provider);
  }, [provider, getProvider]);

  // Get the appropriate API key based on provider
  const apiKey = useMemo(() => {
    if (provider === 'elevenlabs') {
      return elevenLabsApiKey;
    }
    if (provider === 'gemini') {
      return geminiApiKey;
    }
    return undefined;
  }, [provider, elevenLabsApiKey, geminiApiKey]);

  // Fetch voices when provider changes
  const fetchVoices = useCallback(async () => {
    if (!providerInstance) {
      setVoices([]);
      return;
    }

    try {
      setVoicesLoading(true);
      setVoicesError(null);
      setVoices([]);

      const speechVoices = await providerInstance.listVoices({ apiKey });
      setVoices(speechVoices || []);
    } catch (err) {
      setVoicesError(err instanceof Error ? err.message : 'Failed to fetch voices');
      console.error('Error fetching voices:', err);
    } finally {
      setVoicesLoading(false);
    }
  }, [providerInstance, apiKey]);

  // Fetch voices when provider or API key changes
  useEffect(() => {
    if (providerInstance) {
      fetchVoices();
    }
  }, [providerInstance, fetchVoices]);

  // Handle voice selection
  const handleSelectVoice = useCallback(
    (voice: Voice) => {
      setValue('voice_id', voice.id);
      setValue('voice_name', voice.name);
    },
    [setValue]
  );

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
            options={SPEECH_PROVIDERS}
          />

          {provider === 'elevenlabs' && !hasElevenLabsApiKey && (
            <div className="mt-4 rounded-md bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong>API Key Required:</strong> You need to configure your ElevenLabs API key in{' '}
                <a href="/settings/ai" className="underline hover:text-amber-900">
                  AI Settings
                </a>{' '}
                to use ElevenLabs text-to-speech.
              </p>
            </div>
          )}

          {provider === 'gemini' && !hasGeminiApiKey && (
            <div className="mt-4 rounded-md bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong>API Key Required:</strong> You need to configure your Gemini API key in{' '}
                <a href="/settings/ai" className="underline hover:text-amber-900">
                  AI Settings
                </a>{' '}
                to use Gemini text-to-speech.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Voice Selection */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Voice Selection</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Choose a voice for text-to-speech generation. Voices are filtered based on your selected
            provider.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          {voicesLoading && (
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-zinc-600">Loading voices...</p>
              </div>
            </div>
          )}
          {voicesError && (
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-200 p-8 text-center">
                <p className="mt-4 text-zinc-600">Error loading voices: {voicesError}</p>
              </div>
            </div>
          )}
          {!voicesLoading && !voicesError && (
            <VoicesList
              voices={voices}
              selectedVoiceId={selectedVoiceId}
              onSelectVoice={handleSelectVoice}
            />
          )}
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
                  options={ELEVENLABS_MODELS}
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
                  options={GEMINI_MODELS}
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
