'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormCheckbox, FormSelect, FormSlider } from '@/components/ui/form';

import { toast } from 'sonner';

import { getModelsForProvider, getProvidersForFeature } from '@/components/settings';
import type { Account } from '@/types/account';
import type { AIProvider } from '@/types/ai-config';

/**
 * Zod schema for Speech Configuration
 */
export const SpeechSettingsFormSchema = z.object({
  provider: z.enum(['elevenlabs', 'browser', 'gemini']),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  model_id: z.string().optional(),
  settings: z
    .object({
      // Browser TTS settings
      speed: z.number().min(0.1).max(10).optional(),
      pitch: z.number().min(-20).max(20).optional(),
      volume: z.number().min(0).max(1).optional(),
      // ElevenLabs settings
      stability: z.number().min(0).max(1).optional(),
      similarity: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
      speaker_boost: z.boolean().optional(),
      // Gemini settings
      voice_name: z.string().optional(),
    })
    .optional(),
});

export type SpeechSettingsFormData = z.infer<typeof SpeechSettingsFormSchema>;

interface SpeechSettingsFormProps {
  account?: Account;
  onSubmit: (data: SpeechSettingsFormData) => Promise<void>;
  children?: (props: {
    form: ReturnType<typeof useForm<SpeechSettingsFormData>>;
    hasApiKey: boolean;
  }) => React.ReactNode;
}

export function SpeechSettingsForm({ account, onSubmit, children }: SpeechSettingsFormProps) {

  const defaultValues = useMemo((): SpeechSettingsFormData => {
    const speechConfig = account?.ai_speech;
    return {
      provider: (speechConfig?.provider as 'elevenlabs' | 'browser' | 'gemini') ?? 'browser',
      voice_id: speechConfig?.voice_id ?? '',
      voice_name: speechConfig?.voice_name ?? '',
      model_id: speechConfig?.model_id ?? '',
      settings: {
        // Browser settings
        speed: speechConfig?.settings?.speed ?? 1.0,
        pitch: speechConfig?.settings?.pitch ?? 0,
        volume: speechConfig?.settings?.volume ?? 1.0,
        // ElevenLabs settings
        stability: speechConfig?.settings?.stability ?? 0.5,
        similarity: speechConfig?.settings?.similarity ?? 0.75,
        style: speechConfig?.settings?.style ?? 0,
        speaker_boost: speechConfig?.settings?.speaker_boost ?? true,
        // Gemini settings
        voice_name: speechConfig?.settings?.voice_name ?? '',
      },
    };
  }, [account?.ai_speech]);

  const form = useForm<SpeechSettingsFormData>({
    resolver: zodResolver(SpeechSettingsFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (data: SpeechSettingsFormData) => {
    try {
      await onSubmit(data);

      toast.success('Settings Saved', {
        description: 'Your text-to-speech settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving speech settings:', err);
      toast.error('Failed to update speech settings. Please try again.');
    }
  };

  const provider = form.watch('provider');
  const selectedVoiceId = form.watch('voice_id');
  const selectedVoiceName = form.watch('voice_name');

  // Get speech providers from registry
  const speechProviders = useMemo(() => {
    return getProvidersForFeature('speech').map(provider => ({
      id: provider.id,
      name: provider.name,
    }));
  }, []);

  // Get models for selected provider
  const models = useMemo(() => {
    return getModelsForProvider(provider as AIProvider);
  }, [provider]);

  // Check if provider requires API key and if it's configured
  const hasApiKey = useMemo(() => {
    if (provider === 'browser') return true;
    return !!account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
  }, [provider, account]);

  const formFields = (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Text-to-Speech Settings</h2>
        <p className="text-sm text-zinc-600">
          Configure your text-to-speech provider, voice, and advanced settings.
        </p>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>API Key Required:</strong> You need to configure your {provider} API key in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Settings
            </a>{' '}
            to use this speech provider.
          </p>
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">Speech Provider</h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            Choose between browser text-to-speech (free), ElevenLabs (high quality), or Gemini.
          </p>
        </div>
        <FormSelect
          name="provider"
          control={form.control}
          label="Provider"
          options={speechProviders}
          disabled={false}
        />
      </div>

      {/* Current Voice */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">Voice</h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            Your currently selected voice for text-to-speech generation.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-zinc-200 p-3">
          {selectedVoiceName ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{selectedVoiceName}</p>
                {selectedVoiceId && <p className="text-xs text-zinc-500 mt-0.5">ID: {selectedVoiceId}</p>}
              </div>
              <a
                href="/settings/speech"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                Change voice →
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-600">No voice selected</p>
              <a
                href="/settings/speech"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                Select voice →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Provider-Specific Settings - Browser */}
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
                <FormSlider
                  name="settings.speed"
                  control={form.control}
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
                <FormSlider
                  name="settings.pitch"
                  control={form.control}
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
                <FormSlider
                  name="settings.volume"
                  control={form.control}
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

      {/* Provider-Specific Settings - ElevenLabs */}
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
                <FormSelect
                  name="model_id"
                  control={form.control}
                  label="Model"
                  options={models.map(model => ({ id: model.id, name: model.name }))}
                  disabled={!hasApiKey}
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
                <FormSlider
                  name="settings.speed"
                  control={form.control}
                  min={0.7}
                  max={1.2}
                  step={0.1}
                  leftLabel="Slower"
                  rightLabel="Faster"
                  showValue
                  valueFormatter={value => `${value}x`}
                  disabled={!hasApiKey}
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
                <FormSlider
                  name="settings.stability"
                  control={form.control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="More Variable"
                  rightLabel="More Stable"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                  disabled={!hasApiKey}
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
                <FormSlider
                  name="settings.similarity"
                  control={form.control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="Low"
                  rightLabel="High"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                  disabled={!hasApiKey}
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
                <FormSlider
                  name="settings.style"
                  control={form.control}
                  min={0}
                  max={1}
                  step={0.05}
                  leftLabel="None"
                  rightLabel="Exaggerated"
                  showValue
                  valueFormatter={value => `${Math.round(value * 100)}%`}
                  disabled={!hasApiKey}
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
                  control={form.control}
                  label="Enable speaker boost"
                  description="Enhance speaker clarity and reduce background noise"
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider-Specific Settings - Gemini */}
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
                <FormSelect
                  name="model_id"
                  control={form.control}
                  label="Model"
                  options={models.map(model => ({ id: model.id, name: model.name }))}
                  disabled={!hasApiKey}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (children) {
    return (
      <form id="speech-settings-form" onSubmit={form.handleSubmit(handleSubmit)}>
        {formFields}
        {children({ form, hasApiKey })}
      </form>
    );
  }

  return (
    <form id="speech-settings-form" onSubmit={form.handleSubmit(handleSubmit)}>
      {formFields}
    </form>
  );
}
