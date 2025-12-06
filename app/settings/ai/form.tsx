'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Control, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/uix/button';
import { FormInput } from '@/components/uix/form';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';
import { AI_PROVIDERS } from '@/services/ai/registry';

import type { AIFeature, AIServiceProvider, ProviderConfig } from '@/types/ai-config';

// Feature colors mapping
const FEATURE_COLORS: Record<AIFeature, string> = {
  suggestions: 'bg-blue-100 text-blue-800',
  transcription: 'bg-green-100 text-green-800',
  speech: 'bg-purple-100 text-purple-800',
};

// Feature Pills Component
interface FeaturePillsProps {
  features: AIFeature[];
}

function FeaturePills({ features }: FeaturePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {features.map(feature => (
        <span
          key={feature}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FEATURE_COLORS[feature]}`}
        >
          {feature}
        </span>
      ))}
    </div>
  );
}

// Get providers that require API keys
const getProvidersWithApiKeys = (): AIServiceProvider[] => {
  return Object.values(AI_PROVIDERS).filter(provider => provider.requires_api_key);
};

// Dynamically generate Zod schema from provider registry
const createProviderSchema = () => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  getProvidersWithApiKeys().forEach(provider => {
    const apiKeyField = `${provider.id}_api_key`;
    const baseUrlField = `${provider.id}_base_url`;

    schemaFields[apiKeyField] = z.string().optional();
    schemaFields[baseUrlField] = z.string().url('Invalid URL').optional().or(z.literal(''));
  });

  return z.object(schemaFields);
};

const AIProviderSchema = createProviderSchema();
type AIProviderFormData = z.infer<typeof AIProviderSchema>;

interface ProviderSectionProps {
  control: Control<AIProviderFormData>;
  provider: AIServiceProvider;
}

// API key URLs for different providers
const getApiKeyUrl = (providerId: string): string => {
  const urls: Record<string, string> = {
    gemini: 'https://aistudio.google.com/app/apikey',
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    whisper: 'https://platform.openai.com/api-keys',
    'assembly-ai': 'https://www.assemblyai.com/app/account',
  };
  return urls[providerId] || '#';
};

function ProviderSection({ control, provider }: ProviderSectionProps) {
  const apiKeyField = `${provider.id}_api_key`;
  const baseUrlField = `${provider.id}_base_url`;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-zinc-900">{provider.name}</h2>
        <p className="mt-1 text-sm/6 text-zinc-600">{provider.description}</p>
        <div className="mt-2">
          <p className="text-xs text-zinc-500 mb-1">Features:</p>
          <FeaturePills features={provider.features} />
        </div>
        <a
          href={getApiKeyUrl(provider.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Get API Key →
        </a>
      </div>

      <div className="md:col-span-2">
        <div className="px-4">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8">
            <FormInput
              name={apiKeyField as keyof AIProviderFormData}
              control={control}
              label={`${provider.name} API Key`}
              type="password"
              placeholder="Enter your API key"
              autoComplete="off"
            />

            <div>
              <FormInput
                name={baseUrlField as keyof AIProviderFormData}
                control={control}
                label="Custom Base URL (Optional)"
                type="url"
                placeholder="https://api.example.com"
              />
              <p className="mt-2 text-sm text-zinc-500">
                Optional: Use a custom API endpoint (e.g., for proxy or custom deployment)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const form = useForm<AIProviderFormData>({
    resolver: zodResolver(AIProviderSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (data: AIProviderFormData) => {
    try {
      // Build the provider config object dynamically
      const providerConfig: Record<string, { api_key: string; base_url?: string }> = {};

      getProvidersWithApiKeys().forEach(provider => {
        const apiKeyField = `${provider.id}_api_key`;
        const baseUrlField = `${provider.id}_base_url`;
        const apiKey = data[apiKeyField as keyof AIProviderFormData] as string;
        const baseUrl = data[baseUrlField as keyof AIProviderFormData] as string;

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

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Dynamically render provider sections from registry */}
        {getProvidersWithApiKeys().map(provider => (
          <ProviderSection key={provider.id} control={form.control} provider={provider} />
        ))}

        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
