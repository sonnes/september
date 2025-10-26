'use client';

import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { DEFAULT_SPEECH_CONFIG } from '@/services/ai/defaults';

import { SpeechForm, SpeechFormData, SpeechFormSchema } from './speech-form';

export function SpeechModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build default values from account data or fallback to defaults
  const defaultValues = useMemo(() => {
    if (account?.ai_speech) {
      return {
        ...DEFAULT_SPEECH_CONFIG,
        ...account.ai_speech,
      };
    }
    return DEFAULT_SPEECH_CONFIG;
  }, [account]);

  const form = useForm<SpeechFormData>({
    resolver: zodResolver(SpeechFormSchema),
    defaultValues,
  });

  // Reset form when dialog opens or account changes
  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, isOpen]);

  const hasElevenLabsApiKey = Boolean(account?.ai_providers?.eleven_labs?.api_key);

  const onSubmit = async (data: SpeechFormData) => {
    setIsSubmitting(true);
    try {
      await updateAccount({
        ai_speech: data,
      });
      show({
        title: 'Speech Settings',
        message: 'Your text-to-speech settings have been updated successfully.',
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving speech settings:', err);
      showError('Failed to update speech settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
        aria-label="Configure text-to-speech"
      >
        <SpeakerWaveIcon className="w-4 h-4" />
        {account?.ai_speech?.voice_name || 'select voice'}{' '}
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
          <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 shrink-0">
              <DialogTitle className="text-lg font-semibold text-zinc-900">
                Text-to-Speech Settings
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <form id="speech-form" onSubmit={form.handleSubmit(onSubmit)}>
                <SpeechForm
                  control={form.control}
                  setValue={form.setValue}
                  getValues={form.getValues}
                  hasElevenLabsApiKey={hasElevenLabsApiKey}
                />
              </form>
            </div>

            {/* Fixed footer */}
            <div className="shrink-0 border-t border-zinc-200 bg-white p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="speech-form"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
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
