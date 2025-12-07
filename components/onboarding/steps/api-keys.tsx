'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ExternalLink, Key } from 'lucide-react';
import { Control, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormInput } from '@/components/uix/form';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account/context';
import { AI_PROVIDERS } from '@/services/ai/registry';

import type { AIFeature, AIServiceProvider, ProviderConfig } from '@/types/ai-config';

import { useOnboarding } from '../context';

// Feature colors mapping
const FEATURE_COLORS: Record<AIFeature, string> = {
  suggestions: 'bg-blue-100 text-blue-800',
  transcription: 'bg-green-100 text-green-800',
  speech: 'bg-purple-100 text-purple-800',
};

// Feature Pills Component
function FeaturePills({ features }: { features: AIFeature[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {features.map(feature => (
        <span
          key={feature}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FEATURE_COLORS[feature]}`}
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

const APIKeysSchema = createProviderSchema();
type APIKeysFormData = z.infer<typeof APIKeysSchema>;

// API key URLs for different providers
const API_KEY_URLS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  elevenlabs: 'https://elevenlabs.io/app/settings/keys',
};

interface ProviderCardProps {
  control: Control<APIKeysFormData>;
  provider: AIServiceProvider;
}

function ProviderCard({ control, provider }: ProviderCardProps) {
  const apiKeyField = `${provider.id}_api_key`;
  const baseUrlField = `${provider.id}_base_url`;
  const apiKeyUrl = API_KEY_URLS[provider.id] || '#';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-sm">{provider.description}</CardDescription>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <FeaturePills features={provider.features} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <a
          href={apiKeyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Get API Key
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <FormInput
          name={apiKeyField as keyof APIKeysFormData}
          control={control}
          label="API Key"
          type="password"
          placeholder="Enter your API key"
          autoComplete="off"
        />

        <FormInput
          name={baseUrlField as keyof APIKeysFormData}
          control={control}
          label="Custom Base URL (Optional)"
          type="url"
          placeholder="https://api.example.com"
        />
      </CardContent>
    </Card>
  );
}

export function ApiKeysStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
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

  const form = useForm<APIKeysFormData>({
    resolver: zodResolver(APIKeysSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

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
        title: 'API Keys Saved',
        message: 'Your API keys have been configured successfully.',
      });

      goToNextStep();
    } catch (err) {
      console.error('Error saving API keys:', err);
      showError('Failed to save API keys. Please try again.');
    }
  };

  const handleSkip = () => {
    goToNextStep();
  };

  const providers = getProvidersWithApiKeys();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Configure API Keys</h2>
        <p className="mt-2 text-muted-foreground">
          Connect AI providers to enable suggestions, transcription, and voice synthesis. You can
          skip this step and configure later in settings.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> API keys are optional. September works with browser-based speech
          without any API keys. Add keys to enable AI-powered features.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {providers.map(provider => (
          <ProviderCard key={provider.id} control={form.control} provider={provider} />
        ))}

        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="ghost" onClick={goToPreviousStep}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
