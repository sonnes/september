'use client';

import { useEffect, useState } from 'react';

import { PlayIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { Control, UseFormSetValue, UseFormWatch, useForm } from 'react-hook-form';

import {
  AccountFormData,
  AccountSchema,
  BrowserTTSSettingsSection,
  ElevenLabsSettingsSection,
} from '@/components/settings';
import { Button } from '@/components/ui/button';
import { FormDropdown, FormInput, FormRangeWithLabels } from '@/components/ui/form';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { SpeechProvider, useSpeechContext } from '@/services/speech/context';

import { Voice } from '@/types/voice';

interface SectionProps {
  control: Control<AccountFormData>;
  watch: UseFormWatch<AccountFormData>;
  setValue: UseFormSetValue<AccountFormData>;
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

export function TalkSettingsForm() {
  const { account, patchAccount } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { show, showError } = useToast();

  // Create default values that ensure all fields are controlled from the start
  const getDefaultValues = (): AccountFormData => ({
    // Personal Information
    name: account?.name || '',
    city: account?.city || '',
    country: account?.country || '',

    // Medical Information
    primary_diagnosis: account?.primary_diagnosis || '',
    year_of_diagnosis: account?.year_of_diagnosis || new Date().getFullYear(),
    medical_document_path: account?.medical_document_path || '',

    // Speech Settings
    speech_provider: account?.speech_provider || 'browser_tts',
    speech_settings: account?.speech_settings || {
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
      language: '',
    },
    voice: account?.voice,

    // AI Settings
    ai_instructions: account?.ai_instructions || '',
    ai_corpus: account?.ai_corpus || '',
    gemini_api_key: account?.gemini_api_key || '',

    // Flags
    terms_accepted: account?.terms_accepted || false,
    privacy_policy_accepted: account?.privacy_policy_accepted || false,
    onboarding_completed: account?.onboarding_completed || false,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: {},
  } = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema),
    defaultValues: getDefaultValues(),
  });

  const speechProvider = watch('speech_provider');

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);

    try {
      // Extract only the fields that should be updated for this form
      const settings = {
        speech_provider: data.speech_provider,
        speech_settings: data.speech_settings,
        voice: data.voice,
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
