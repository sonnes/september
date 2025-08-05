'use client';

import { useEffect, useState } from 'react';

import { Input } from '@headlessui/react';
import { PlayIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { Control, Controller, UseFormSetValue, UseFormWatch, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAccountContext } from '@/components/context/account-provider';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownOption } from '@/components/ui/dropdown';
import { useToast } from '@/hooks/use-toast';
import { Voice } from '@/services/speech';
import { SpeechProvider, useSpeechContext } from '@/services/speech/context';
import { BrowserTTSSettings, ElevenLabsSettings } from '@/types/account';

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
  const providerOptions: DropdownOption[] = providers.map(provider => ({
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
              <Controller
                name="speech_provider"
                control={control}
                render={({ field, fieldState }) => (
                  <Dropdown
                    options={providerOptions}
                    selectedValue={field.value || ''}
                    onSelect={providerId => {
                      const provider = providers.find(p => p.id === providerId);
                      field.onChange(provider?.id || providerId);
                      setProvider(providerId);
                    }}
                    placeholder="Select a provider"
                    label="Speech Provider"
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceSection({ control, watch, setValue }: SectionProps) {
  const { getVoices, generateSpeech } = useSpeechContext();
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
    setValue('speech_voice_id', voiceId);
    if (speechProvider === 'elevenlabs') {
      setValue('elevenlabs_settings.voice_id', voiceId);
    } else if (speechProvider === 'browser_tts') {
      setValue('browser_tts_settings.voice_id', voiceId);
    }
  };

  const onPlayPreview = async (voiceId: string) => {
    try {
      const sampleText = 'Hello, this is a preview of my voice.';
      const response = await generateSpeech(sampleText, {
        voice_id: voiceId,
      });

      const audioBlob = await fetch(response.blob).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
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
                      <Controller
                        name="speech_voice_id"
                        control={control}
                        render={({ field }) => (
                          <>
                            {(field.value || '') !== voice.id ? (
                              <button
                                type="button"
                                onClick={() => onSelectVoice(voice.id)}
                                className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                              >
                                Use
                              </button>
                            ) : (
                              <div className="p-2 text-green-600 text-sm font-medium">Selected</div>
                            )}
                          </>
                        )}
                      />
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
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">API Key</h3>
                <Controller
                  name="elevenlabs_settings.api_key"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="password"
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder="Enter your ElevenLabs API key"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  )}
                />
              </div>

              {/* Model Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Model</h3>
                <Controller
                  name="elevenlabs_settings.model_id"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={MODELS.map(model => ({ id: model.id, name: model.name }))}
                      selectedValue={field.value || ''}
                      onSelect={field.onChange}
                      placeholder="Select a model"
                    />
                  )}
                />
              </div>

              {/* Speed Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Speed</h3>
                <Controller
                  name="elevenlabs_settings.speed"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Slower</span>
                        <span>Faster</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.2"
                        step="0.1"
                        value={field.value || 1.0}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">{field.value || 1.0}x</div>
                    </div>
                  )}
                />
              </div>

              {/* Stability Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Stability</h3>
                <Controller
                  name="elevenlabs_settings.stability"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>More variable</span>
                        <span>More stable</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={field.value || 0.5}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {Math.round((field.value || 0.5) * 100)}%
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Similarity Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Similarity</h3>
                <Controller
                  name="elevenlabs_settings.similarity"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={field.value || 0.5}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {Math.round((field.value || 0.5) * 100)}%
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Style Exaggeration Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Style Exaggeration</h3>
                <Controller
                  name="elevenlabs_settings.style"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>None</span>
                        <span>Exaggerated</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={field.value || 0.0}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {Math.round((field.value || 0.0) * 100)}%
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Speaker Boost Toggle */}
              <div className="flex items-center justify-between pt-2">
                <label htmlFor="speakerBoost" className="text-sm font-medium text-gray-900">
                  Speaker boost
                </label>
                <Controller
                  name="elevenlabs_settings.speaker_boost"
                  control={control}
                  render={({ field }) => (
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                      <input
                        type="checkbox"
                        id="speakerBoost"
                        checked={field.value || false}
                        onChange={e => field.onChange(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                          field.value || false ? 'translate-x-5 bg-indigo-600' : ''
                        }`}
                      ></span>
                    </div>
                  )}
                />
              </div>
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
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Speed</h3>
                <Controller
                  name="browser_tts_settings.speed"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Slower</span>
                        <span>Faster</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={field.value || 1.0}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">{field.value || 1.0}x</div>
                    </div>
                  )}
                />
              </div>

              {/* Pitch Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pitch</h3>
                <Controller
                  name="browser_tts_settings.pitch"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Lower</span>
                        <span>Higher</span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={field.value || 0}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">{field.value || 0}</div>
                    </div>
                  )}
                />
              </div>

              {/* Volume Control */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Volume</h3>
                <Controller
                  name="browser_tts_settings.volume"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Quieter</span>
                        <span>Louder</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={field.value || 1}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {Math.round((field.value || 1) * 100)}%
                      </div>
                    </div>
                  )}
                />
              </div>
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
    speech_voice_id:
      account?.elevenlabs_settings?.voice_id || account?.browser_tts_settings?.voice_id || '',
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
    formState: { errors },
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
  }, [account, reset]);

  const onSubmit = async (data: TalkSettingsFormData) => {
    setIsSubmitting(true);

    try {
      const settings = {
        speech_provider: data.speech_provider,
        elevenlabs_settings: data.speech_provider === 'elevenlabs' ? data.elevenlabs_settings : {},
        browser_tts_settings:
          data.speech_provider === 'browser_tts' ? data.browser_tts_settings : {},
      };

      console.log('settings', settings);
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

  console.log('errors', errors);

  return (
    <SpeechProvider>
      <div className="divide-y divide-gray-400">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProviderSection control={control} watch={watch} setValue={setValue} />
          <VoiceSection control={control} watch={watch} setValue={setValue} />

          {speechProvider === 'elevenlabs' && <ElevenLabsSettingsSection control={control} />}
          {speechProvider === 'browser_tts' && <BrowserTTSSettingsSection control={control} />}

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
