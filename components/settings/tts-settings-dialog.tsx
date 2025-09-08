'use client';

import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { SettingsFormData, SettingsSchema } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { FormCheckbox, FormDropdown, FormInput, FormRangeWithLabels } from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

interface TTSSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TTSSettingsDialog({ isOpen, onClose }: TTSSettingsDialogProps) {
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => {
    return {
      speech_provider: account?.speech_provider || 'browser_tts',
      speech_settings: {
        api_key: account?.speech_settings?.api_key || '',
        model_id: account?.speech_settings?.model_id || '',
        speed: account?.speech_settings?.speed || 1.0,
        stability: account?.speech_settings?.stability || 0.5,
        similarity: account?.speech_settings?.similarity || 0.5,
        style: account?.speech_settings?.style || 0.5,
        speaker_boost: account?.speech_settings?.speaker_boost || false,
        pitch: account?.speech_settings?.pitch || 0,
        volume: account?.speech_settings?.volume || 1.0,
      },
    };
  }, [account]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, isOpen]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updateAccount({
        speech_provider: data.speech_provider,
        speech_settings: data.speech_settings,
      });
      show({
        title: 'TTS Settings',
        message: 'Your TTS settings have been updated successfully.',
      });
      onClose();
    } catch (err) {
      console.error('Error saving TTS settings:', err);
      showError('Failed to update TTS settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speechProvider = form.watch('speech_provider');

  if (!account) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Mobile: Full screen, Desktop: Centered modal */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
        <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-gray-900">TTS Settings</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Mobile-optimized speech provider section */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base/7 font-semibold text-gray-900">Provider</h2>
                    <p className="mt-1 text-sm/6 text-gray-600">
                      Select the provider you want to use for generating speech.
                    </p>
                    {speechProvider === 'elevenlabs' && (
                      <p className="mt-1 text-sm/6 text-gray-600">
                        You can get your API key from the{' '}
                        <a
                          href="https://elevenlabs.io/app/settings/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500 underline"
                        >
                          ElevenLabs API Keys page
                        </a>
                        .
                      </p>
                    )}
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="space-y-4">
                      <FormDropdown
                        name="speech_provider"
                        control={form.control}
                        label="Speech Provider"
                        required
                        placeholder="Select a provider"
                        options={[
                          { id: 'browser_tts', name: 'Browser TTS' },
                          { id: 'elevenlabs', name: 'ElevenLabs' },
                        ]}
                      />

                      {speechProvider === 'elevenlabs' && (
                        <FormInput
                          name="speech_settings.api_key"
                          control={form.control}
                          label="API Key"
                          type="password"
                          required
                          placeholder="Enter your ElevenLabs API key"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {speechProvider === 'elevenlabs' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base/7 font-semibold text-gray-900">
                        ElevenLabs Settings
                      </h2>
                      <p className="mt-1 text-sm/6 text-gray-600">
                        Configure the settings for ElevenLabs speech generation.
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <div className="space-y-6">
                        {/* Model Selection */}
                        <FormDropdown
                          name="speech_settings.model_id"
                          control={form.control}
                          label="Model"
                          options={[
                            { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
                            { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
                            { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
                          ]}
                          placeholder="Select a model"
                        />

                        {/* Speed Control */}
                        <FormRangeWithLabels
                          name="speech_settings.speed"
                          control={form.control}
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
                          name="speech_settings.stability"
                          control={form.control}
                          label="Stability"
                          leftLabel="More Variable"
                          rightLabel="More Stable"
                          min={0}
                          max={1}
                          step={0.1}
                          valueFormatter={value => value.toFixed(1)}
                        />

                        {/* Similarity Control */}
                        <FormRangeWithLabels
                          name="speech_settings.similarity"
                          control={form.control}
                          label="Similarity"
                          leftLabel="More Different"
                          rightLabel="More Similar"
                          min={0}
                          max={1}
                          step={0.1}
                          valueFormatter={value => value.toFixed(1)}
                        />

                        {/* Style Control */}
                        <FormRangeWithLabels
                          name="speech_settings.style"
                          control={form.control}
                          label="Style"
                          leftLabel="Less Styled"
                          rightLabel="More Styled"
                          min={0}
                          max={1}
                          step={0.1}
                          valueFormatter={value => value.toFixed(1)}
                        />

                        {/* Speaker Boost */}
                        <FormCheckbox
                          name="speech_settings.speaker_boost"
                          control={form.control}
                          label="Speaker Boost"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {speechProvider === 'browser_tts' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base/7 font-semibold text-gray-900">
                        Browser TTS Settings
                      </h2>
                      <p className="mt-1 text-sm/6 text-gray-600">
                        Configure the settings for browser text-to-speech.
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-4">
                      <div className="space-y-6">
                        {/* Speed Control */}
                        <FormRangeWithLabels
                          name="speech_settings.speed"
                          control={form.control}
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
                          name="speech_settings.pitch"
                          control={form.control}
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
                          name="speech_settings.volume"
                          control={form.control}
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
                )}
              </div>

              {/* Fixed footer on mobile, inline on desktop */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
