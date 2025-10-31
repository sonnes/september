'use client';

import { useMemo } from 'react';

import { APIKeysForm, type APIKeysFormData } from '@/components/settings';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { AI_PROVIDERS } from '@/services/ai/registry';

import type { ProviderConfig } from '@/types/ai-config';

// Get providers that require API keys
const getProvidersWithApiKeys = () => {
  return Object.values(AI_PROVIDERS).filter(provider => provider.requires_api_key);
};

export default function AISettingsForm() {
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();

  const defaultValues = useMemo(() => {
    const values: Record<string, string> = {};

    getProvidersWithApiKeys().forEach(provider => {
      const apiKeyField = `${provider.id}_api_key`;
      const baseUrlField = `${provider.id}_base_url`;
      const providerConfig =
        account?.ai_providers?.[provider.id as keyof typeof account.ai_providers];

      values[apiKeyField] = providerConfig?.api_key || '';
      values[baseUrlField] = providerConfig?.base_url || '';
    });

    return values;
  }, [account]);

  const onSubmit = async (data: APIKeysFormData) => {
    try {
      // Build the provider config object dynamically
      const providerConfig: Record<string, { api_key: string; base_url?: string }> = {};

      getProvidersWithApiKeys().forEach(provider => {
        const apiKeyField = `${provider.id}_api_key`;
        const baseUrlField = `${provider.id}_base_url`;
        const apiKey = data[apiKeyField as keyof APIKeysFormData] as string;
        const baseUrl = data[baseUrlField as keyof APIKeysFormData] as string;

        // Only include provider if API key is provided
        if (apiKey) {
          providerConfig[provider.id] = {
            api_key: apiKey,
          };
          if (baseUrl) {
            providerConfig[provider.id].base_url = baseUrl;
          }
        }
      });

      await updateAccount({
        ai_providers: providerConfig as ProviderConfig,
      });

      show({
        title: 'Settings Saved',
        message: 'Your AI provider settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving AI settings:', err);
      showError('Failed to update AI settings. Please try again.');
    }
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-400">
      {/* Info Section */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
        <div className="px-4">
          <h2 className="text-base/7 font-semibold text-zinc-900">Provider Configuration</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">Configure API keys for AI providers.</p>
        </div>
        <div className="md:col-span-2">
          <div className="px-4">
            <p className="text-sm text-zinc-600">
              September uses external AI services to power features like suggestions, transcription,
              and speech synthesis. Configure your API keys below to enable these features.
            </p>
            <div className="mt-4 rounded-md bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong>Security Note:</strong> API keys are sensitive credentials. Never share them
                with others.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Form */}
      <APIKeysForm
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        variant="settings"
        showSecurityNote={false}
      />
    </div>
  );
}
