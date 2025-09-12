'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { AccountFormData, AccountSchema } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { FormDropdown, FormInput } from '@/components/ui/form';
import VoicesList from '@/components/voices/voices-list';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { useSpeechContext } from '@/services/speech/context';

import type { Voice } from '@/types/voice';

export function SpeechProviderDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();
  const { getProvider } = useSpeechContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const defaultValues = useMemo(() => {
    return {
      speech_provider: account?.speech_provider || 'browser_tts',
      speech_settings: {
        api_key: account?.speech_settings?.api_key || '',
      },
    };
  }, [account]);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, isOpen]);

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    try {
      await updateAccount({
        speech_provider: data.speech_provider,
        speech_settings: {
          ...account?.speech_settings,
          api_key: data.speech_settings?.api_key,
        },
      });
      show({
        title: 'TTS Settings',
        message: 'Your TTS settings have been updated successfully.',
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving TTS settings:', err);
      showError('Failed to update TTS settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speechProvider = form.watch('speech_provider');

  const provider = useMemo(() => {
    if (!speechProvider) {
      return null;
    }

    return getProvider(speechProvider);
  }, [speechProvider, getProvider]);

  const fetchVoices = useCallback(async () => {
    try {
      setVoicesLoading(true);
      setVoicesError(null);
      setVoices([]);

      console.log('fetching voices');

      console.log('provider', provider);
      console.log('speechProvider', speechProvider);

      const speechVoices = await provider?.listVoices({});
      setVoices(speechVoices || []);
    } catch (err) {
      setVoicesError(err instanceof Error ? err.message : 'Failed to fetch voices');
      console.error('Error fetching voices:', err);
    } finally {
      setVoicesLoading(false);
    }
  }, [speechProvider, provider]);

  // Handle voice selection
  const handleSelectVoice = useCallback(
    async (voice: Voice) => {
      try {
        await updateAccount({
          voice: { id: voice.id, name: voice.name, language: voice.language },
        });
        show({
          title: 'Voice Selected',
          message: `Selected voice: ${voice.name}`,
        });
      } catch (err) {
        console.error('Error selecting voice:', err);
        showError('Failed to select voice. Please try again.');
      }
    },
    [updateAccount, show, showError]
  );

  // Fetch voices when provider changes
  useEffect(() => {
    if (isOpen && provider) {
      fetchVoices();
    }
  }, [provider, isOpen, fetchVoices]);

  if (!account) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
        aria-label="Open TTS settings"
      >
        <SpeakerWaveIcon className="w-4 h-4" />
        <span className="text-sm hidden md:block">{account?.voice?.name || 'select voice'}</span>
      </button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Mobile: Full screen, Desktop: Centered modal */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
          <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-zinc-900">
                TTS Settings
              </DialogTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <form
                id="speech-settings-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="p-4 sm:p-6"
              >
                <div className="space-y-4 sm:space-y-6">
                  {/* Provider Selection */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base/7 font-semibold text-zinc-900">Provider</h2>
                      <p className="mt-1 text-sm/6 text-zinc-600">
                        Select the provider you want to use for generating speech.
                      </p>
                      {speechProvider === 'elevenlabs' && (
                        <p className="mt-1 text-sm/6 text-zinc-600">
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
                    <div className="rounded-md bg-zinc-50 p-4">
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

                  {/* Voice Selection */}

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-base/7 font-semibold text-zinc-900">Voice Selection</h2>
                      <p className="mt-1 text-sm/6 text-zinc-600">
                        Choose a voice for text-to-speech generation.
                      </p>
                    </div>
                    <div className="">
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
                            <p className="mt-4 text-zinc-600">
                              Error loading voices: {voicesError}
                            </p>
                          </div>
                        </div>
                      )}
                      <VoicesList
                        voices={voices}
                        selectedVoiceId={account?.voice?.id}
                        onSelectVoice={handleSelectVoice}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Fixed footer with form actions */}
            <div className="flex-shrink-0 border-t border-zinc-200 bg-white p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="speech-settings-form"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
