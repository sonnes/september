'use client';

import { useEffect, useState } from 'react';

import { PlayIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { Control, UseFormSetValue, UseFormWatch, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormCheckbox, FormDropdown, FormInput, FormRangeWithLabels } from '@/components/ui/form';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { useAccountContext } from '@/services/account/context';
import { Voice } from '@/services/speech';
import { SpeechProvider, useSpeechContext } from '@/services/speech/context';

// Validation schema for the form
const talkSettingsSchema = z.object({
  speech_provider: z.string().min(1, 'Speech provider is required'),

  elevenlabs_settings: z.object({
    api_key: z.string().min(1, 'API key is required'),
    model_id: z.string().optional(),
    voice_id: z.string().optional(),
    speed: z.number().min(0.7).max(1.2),
    stability: z.number().min(0).max(1),
    similarity: z.number().min(0).max(1),
    style: z.number().min(0).max(1),
    speaker_boost: z.boolean(),
  }),
  browser_tts_settings: z.object({
    voice_id: z.string().optional(),
    speed: z.number().min(0.5).max(2.0),
    pitch: z.number().min(-20).max(20).optional(),
    volume: z.number().min(0).max(1).optional(),
    language: z.string().optional(),
  }),
});

type TalkSettingsFormData = z.infer<typeof talkSettingsSchema>;

interface SectionProps {
  control: Control<TalkSettingsFormData>;
  watch: UseFormWatch<TalkSettingsFormData>;
  setValue: UseFormSetValue<TalkSettingsFormData>;
}

function ProviderSection({ control }: SectionProps) {
  const { getProviders, setProvider } = useSpeechContext();
  const providers = getProviders();

  // Convert providers to dropdown options
  const providerOptions = providers.map(provider => ({
    id: provider.id,
    name: provider.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Provider</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Select the provider you want to use for generating speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-4">
              <FormDropdown
                name="speech_provider"
                control={control}
                label="Speech Provider"
                required
                placeholder="Select a provider"
                options={providerOptions}
                onSelect={providerId => {
                  setProvider(providerId);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceSection({ watch, setValue }: SectionProps) {
  const { getVoices, generateSpeech } = useSpeechContext();
  const { enqueue } = useAudioPlayer();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const speechProvider = watch('speech_provider');

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const voicesList = await getVoices();
        setVoices(voicesList);
      } catch (error) {
        console.error('Error loading voices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVoices();
  }, [speechProvider, getVoices]);

  const onSelectVoice = (voiceId: string) => {
    if (speechProvider === 'elevenlabs') {
      setValue('elevenlabs_settings.voice_id', voiceId);
    } else if (speechProvider === 'browser_tts') {
      setValue('browser_tts_settings.voice_id', voiceId);
    }
  };

  const onPlayPreview = async (voiceId: string) => {
    try {
      const sampleText = 'Hello, this is a preview of my voice.';
      const audio = await generateSpeech(sampleText, {
        voice_id: voiceId,
      });

      enqueue(audio);
    } catch (error) {
      console.error('Error playing voice preview:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Voice</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Select the voice you want to use for generating speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div className="rounded-md bg-gray-50 p-4 h-64 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-700">
                <p>Loading voices...</p>
              </div>
            ) : voices.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {voices.map((voice, index) => (
                  <li key={index} className="flex items-center justify-between gap-x-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-start gap-x-3">
                        <p className="text-sm/6 font-semibold text-gray-900">{voice.name}</p>
                        <span className="mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20">
                          {voice.language}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
                        <span className="whitespace-nowrap">Voice ID: {voice.id}</span>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-x-4">
                      <button
                        type="button"
                        onClick={() => onPlayPreview(voice.id)}
                        className="rounded-md bg-white p-2 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300 hover:text-gray-500 hover:bg-gray-50"
                        title="Play preview"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      {(() => {
                        const currentVoiceId =
                          speechProvider === 'elevenlabs'
                            ? watch('elevenlabs_settings.voice_id')
                            : watch('browser_tts_settings.voice_id');

                        return currentVoiceId !== voice.id ? (
                          <button
                            type="button"
                            onClick={() => onSelectVoice(voice.id)}
                            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            Use
                          </button>
                        ) : (
                          <div className="p-2 text-green-600 text-sm font-medium">Selected</div>
                        );
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-700">
                <p>No voices available for the selected provider.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

function ElevenLabsSettingsSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">ElevenLabs Settings</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Configure the settings for ElevenLabs speech generation.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-6">
              {/* API Key */}
              <FormInput
                name="elevenlabs_settings.api_key"
                control={control}
                label="API Key"
                type="password"
                required
                placeholder="Enter your ElevenLabs API key"
              />

              {/* Model Selection */}
              <FormDropdown
                name="elevenlabs_settings.model_id"
                control={control}
                label="Model"
                options={MODELS}
                placeholder="Select a model"
              />

              {/* Speed Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.speed"
                control={control}
                label="Speed"
                leftLabel="Slower"
                rightLabel="Faster"
                min={0.7}
                max={1.2}
                step={0.1}
                valueFormatter={value => `${value}x`}
              />

              {/* Stability Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.stability"
                control={control}
                label="Stability"
                leftLabel="More variable"
                rightLabel="More stable"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Similarity Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.similarity"
                control={control}
                label="Similarity"
                leftLabel="Low"
                rightLabel="High"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Style Exaggeration Control */}
              <FormRangeWithLabels
                name="elevenlabs_settings.style"
                control={control}
                label="Style Exaggeration"
                leftLabel="None"
                rightLabel="Exaggerated"
                min={0}
                max={1}
                step={0.05}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />

              {/* Speaker Boost Toggle */}
              <FormCheckbox
                name="elevenlabs_settings.speaker_boost"
                control={control}
                label="Speaker boost"
                description="Enhance speaker clarity and reduce background noise"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserTTSSettingsSection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Browser TTS Settings</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Configure the settings for browser text-to-speech.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="space-y-6">
              {/* Speed Control */}
              <FormRangeWithLabels
                name="browser_tts_settings.speed"
                control={control}
                label="Speed"
                leftLabel="Slower"
                rightLabel="Faster"
                min={0.5}
                max={2.0}
                step={0.1}
                valueFormatter={value => `${value}x`}
              />

              {/* Pitch Control */}
              <FormRangeWithLabels
                name="browser_tts_settings.pitch"
                control={control}
                label="Pitch"
                leftLabel="Lower"
                rightLabel="Higher"
                min={-20}
                max={20}
                step={1}
                valueFormatter={value => value.toString()}
              />

              {/* Volume Control */}
              <FormRangeWithLabels
                name="browser_tts_settings.volume"
                control={control}
                label="Volume"
                leftLabel="Quieter"
                rightLabel="Louder"
                min={0}
                max={1}
                step={0.1}
                valueFormatter={value => `${Math.round(value * 100)}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TalkSettingsForm() {
  const { account, patchAccount } = useAccountContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, showError } = useToast();

  // Create default values that ensure all fields are controlled from the start
  const getDefaultValues = (): TalkSettingsFormData => ({
    speech_provider: account?.speech_provider || 'browser_tts',
    elevenlabs_settings: {
      api_key: account?.elevenlabs_settings?.api_key || '',
      model_id: account?.elevenlabs_settings?.model_id || 'eleven_multilingual_v2',
      voice_id: account?.elevenlabs_settings?.voice_id || '',
      speed: account?.elevenlabs_settings?.speed || 1.0,
      stability: account?.elevenlabs_settings?.stability || 0.5,
      similarity: account?.elevenlabs_settings?.similarity || 0.5,
      style: account?.elevenlabs_settings?.style || 0.0,
      speaker_boost: account?.elevenlabs_settings?.speaker_boost || false,
    },
    browser_tts_settings: {
      voice_id: account?.browser_tts_settings?.voice_id || '',
      speed: account?.browser_tts_settings?.speed || 1.0,
      pitch: account?.browser_tts_settings?.pitch || 0,
      volume: account?.browser_tts_settings?.volume || 1.0,
      language: account?.browser_tts_settings?.language || '',
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: {},
  } = useForm<TalkSettingsFormData>({
    resolver: zodResolver(talkSettingsSchema),
    defaultValues: getDefaultValues(),
  });

  const speechProvider = watch('speech_provider');

  // Reset form when account changes
  useEffect(() => {
    if (account) {
      reset(getDefaultValues());
    }
  }, [account, reset, getDefaultValues]);

  const onSubmit = async (data: TalkSettingsFormData) => {
    setIsSubmitting(true);

    try {
      const settings = {
        speech_provider: data.speech_provider,
        elevenlabs_settings:
          data.speech_provider === 'elevenlabs'
            ? data.elevenlabs_settings
            : account.elevenlabs_settings,
        browser_tts_settings:
          data.speech_provider === 'browser_tts'
            ? data.browser_tts_settings
            : account.browser_tts_settings,
      };

      await patchAccount(settings);

      show({
        title: 'Talk settings',
        message: 'Your talk settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving talk settings:', err);
      showError('Failed to update talk settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render the form until account is loaded
  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <SpeechProvider>
      <div className="divide-y divide-gray-400">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProviderSection control={control} watch={watch} setValue={setValue} />
          <VoiceSection control={control} watch={watch} setValue={setValue} />

          {speechProvider === 'elevenlabs' && (
            <ElevenLabsSettingsSection control={control} watch={watch} setValue={setValue} />
          )}
          {speechProvider === 'browser_tts' && (
            <BrowserTTSSettingsSection control={control} watch={watch} setValue={setValue} />
          )}

          {/* Floating save button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SpeechProvider>
  );
}
