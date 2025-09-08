'use client';

import { FormDropdown, FormInput } from '@/components/ui/form';

import { useSpeechContext } from '@/services/speech';

import { SectionProps } from './types';

export function SpeechProviderSection({ control, watch }: SectionProps) {
  const { getProviders } = useSpeechContext();
  const providers = getProviders();

  const providerOptions = providers.map(provider => ({
    id: provider.id,
    name: provider.name,
  }));

  const selectedProvider = watch('speech_provider');

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Provider</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Select the provider you want to use for generating speech.
        </p>
        {selectedProvider === 'elevenlabs' && (
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

              {selectedProvider === 'elevenlabs' && (
                <FormInput
                  name="speech_settings.api_key"
                  control={control}
                  label="API Key"
                  type="password"
                  required
                  placeholder="Enter your ElevenLabs API key"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
