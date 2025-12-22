'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { Account } from '@/types/account';
import type { Providers } from '@/types/ai-config';

import { AIProvidersFormData, AIProvidersSchema } from './schemas';
import { AI_PROVIDERS } from '@/services/ai';

// Get providers that require API keys
const getProvidersWithApiKeys = () => {
  return Object.values(AI_PROVIDERS).filter(provider => provider.requires_api_key);
};

interface AIProvidersFormProps {
  account?: Account;
  onSubmit: (providers: Providers) => Promise<void>;
  children: (props: {
    form: ReturnType<typeof useForm<AIProvidersFormData>>;
    allProviders: typeof AI_PROVIDERS;
    hasApiKey: (providerId: string) => boolean;
  }) => React.ReactNode;
}

export function AIProvidersForm({ account, onSubmit, children }: AIProvidersFormProps) {
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

  const form = useForm<AIProvidersFormData>({
    resolver: zodResolver(AIProvidersSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (data: AIProvidersFormData) => {
    try {
      // Build the provider config object dynamically
      const providerConfig: Record<string, { api_key: string; base_url?: string }> = {};

      getProvidersWithApiKeys().forEach(provider => {
        const apiKeyField = `${provider.id}_api_key`;
        const baseUrlField = `${provider.id}_base_url`;
        const apiKey = data[apiKeyField as keyof AIProvidersFormData] as string;
        const baseUrl = data[baseUrlField as keyof AIProvidersFormData] as string;

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

      await onSubmit(providerConfig as Providers);

      toast.success('Settings Saved', {
        description: 'Your AI provider settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving AI settings:', err);
      toast.error('Failed to update AI settings. Please try again.');
    }
  };

  // Check which providers have API keys configured
  const hasApiKey = (providerId: string) => {
    return !!account?.ai_providers?.[providerId as keyof typeof account.ai_providers]?.api_key;
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {children({ form, allProviders: AI_PROVIDERS, hasApiKey })}
    </form>
  );
}
