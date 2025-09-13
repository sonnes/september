'use client';

import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { SpeechSettingsFormData, SpeechSettingsSchema } from '@/components/settings';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

import { BrowserTTSSettingsSection } from './speech/browser';
import { ElevenLabsSettingsSection } from './speech/elevenlabs';

export function SpeechSettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => {
    return {
      speech_settings: {
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

  const form = useForm<SpeechSettingsFormData>({
    resolver: zodResolver(SpeechSettingsSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, isOpen]);

  const onSubmit = async (data: SpeechSettingsFormData) => {
    setIsSubmitting(true);
    try {
      await updateAccount({
        speech_settings: {
          ...account?.speech_settings,
          ...data.speech_settings,
        },
      });
      show({
        title: 'Speech Settings',
        message: 'Your speech settings have been updated successfully.',
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving speech settings:', err);
      showError('Failed to update speech settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speechProvider = account?.speech_provider || 'browser_tts';

  if (!account) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-1 py-1 text-zinc-800 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
        aria-label="Open speech settings"
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
      </button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Mobile: Full screen, Desktop: Centered modal */}
        <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
          <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-zinc-900">
                Speech Settings
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
                  {/* ElevenLabs Settings Section */}
                  {speechProvider === 'elevenlabs' && (
                    <ElevenLabsSettingsSection
                      control={form.control}
                      watch={form.watch}
                      setValue={form.setValue}
                    />
                  )}

                  {/* Browser TTS Settings Section */}
                  {speechProvider === 'browser_tts' && (
                    <BrowserTTSSettingsSection
                      control={form.control}
                      watch={form.watch}
                      setValue={form.setValue}
                    />
                  )}
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
