'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  AccountFormData,
  AccountSchema,
  BrowserTTSSettingsSection,
  ElevenLabsSettingsSection,
} from '@/components/settings';
import { SectionProps } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { FormDropdown } from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { SpeechProvider, useSpeechContext } from '@/services/speech/context';

function ProviderSection({ control }: SectionProps) {
  const { getProviders } = useSpeechContext();
  const providers = getProviders();

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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TalkSettingsForm() {
  const { account, updateAccount } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, showError } = useToast();

  const defaultValues = useMemo(() => {
    return {
      ...account,
      speech_provider: account?.speech_provider || 'browser_tts',
      speech_settings: account?.speech_settings || {
        speed: 1.0,
        pitch: 0,
        volume: 1.0,
      },
    };
  }, [account]);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const speechProvider = form.watch('speech_provider');

  console.log(form.formState.errors);
  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);

    try {
      const settings = {
        speech_provider: data.speech_provider,
        speech_settings: data.speech_settings,
      };

      await updateAccount(settings);

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
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ProviderSection control={form.control} watch={form.watch} setValue={form.setValue} />

          {speechProvider === 'elevenlabs' && (
            <ElevenLabsSettingsSection
              control={form.control}
              watch={form.watch}
              setValue={form.setValue}
            />
          )}
          {speechProvider === 'browser_tts' && (
            <BrowserTTSSettingsSection
              control={form.control}
              watch={form.watch}
              setValue={form.setValue}
            />
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
