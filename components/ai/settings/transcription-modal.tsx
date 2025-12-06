'use client';

import { useEffect, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/uix/button';

import { useToast } from '@/hooks/use-toast';

import { useAISettings } from '@/services/ai';

import {
  TranscriptionForm,
  TranscriptionFormData,
  TranscriptionFormSchema,
} from './transcription-form';

export function TranscriptionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { transcription, updateTranscription } = useAISettings();

  const { show, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TranscriptionFormData>({
    resolver: zodResolver(TranscriptionFormSchema),
    defaultValues: {
      enabled: transcription.enabled,
      provider: transcription.provider,
      model: transcription.model as 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro',
      settings: transcription.settings,
    },
  });

  // Reset form when dialog opens or transcription config changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        enabled: transcription.enabled,
        provider: transcription.provider,
        model: transcription.model as
          | 'gemini-2.5-flash-lite'
          | 'gemini-2.5-flash'
          | 'gemini-2.5-pro',
        settings: transcription.settings,
      });
    }
  }, [transcription, form, isOpen]);

  const onSubmit = async (data: TranscriptionFormData) => {
    setIsSubmitting(true);
    try {
      await updateTranscription(data);
      show({
        title: 'Transcription Settings',
        message: 'Your speech-to-text transcription settings have been updated successfully.',
      });
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving transcription settings:', err);
      showError('Failed to update transcription settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1 text-zinc-600 rounded-full transition-colors cursor-pointer hover:bg-zinc-100 border border-zinc-200"
        aria-label="Configure speech-to-text transcription"
      >
        <MicrophoneIcon className="w-4 h-4" />
        <span className="text-sm hidden md:block">Transcription</span>
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
          <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 shrink-0">
              <DialogTitle className="text-lg font-semibold text-zinc-900">
                Transcription Settings
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
              <form id="transcription-form" onSubmit={form.handleSubmit(onSubmit)}>
                <TranscriptionForm control={form.control} watch={form.watch} />
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
                  form="transcription-form"
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
