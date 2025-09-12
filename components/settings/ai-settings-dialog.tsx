'use client';

import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { SettingsFormData, SettingsSchema } from '@/components/settings';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

import { AISettingsSection } from './ai-settings-section';

interface AISettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettingsDialog({ isOpen, onClose }: AISettingsDialogProps) {
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo(() => {
    return {
      gemini_api_key: account?.gemini_api_key || '',
      ai_instructions: account?.ai_instructions || '',
      ai_corpus: account?.ai_corpus || '',
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
        gemini_api_key: data.gemini_api_key,
        ai_instructions: data.ai_instructions,
        ai_corpus: data.ai_corpus,
      });
      show({
        title: 'AI Settings',
        message: 'Your AI settings have been updated successfully.',
      });
      onClose();
    } catch (err) {
      console.error('Error saving AI settings:', err);
      showError('Failed to update AI settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Mobile: Full screen, Desktop: Centered modal */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
        <DialogPanel className="mx-auto w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-200 flex-shrink-0">
            <DialogTitle className="text-lg font-semibold text-zinc-900">AI Settings</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                <AISettingsSection
                  control={form.control}
                  watch={form.watch}
                  setValue={form.setValue}
                />
              </div>

              {/* Fixed footer on mobile, inline on desktop */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-zinc-200">
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
