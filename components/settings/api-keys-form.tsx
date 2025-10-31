'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form';

import { AI_PROVIDERS } from '@/services/ai/registry';

import type { AIFeature, AIServiceProvider } from '@/types/ai-config';

/**
 * Reusable API Keys Form Component
 *
 * Used in both onboarding wizard and settings page to collect API keys
 * for AI providers.
 */

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

// API key URLs for different providers
const getApiKeyUrl = (providerId: string): string => {
  const urls: Record<string, string> = {
    gemini: 'https://aistudio.google.com/app/apikey',
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    whisper: 'https://platform.openai.com/api-keys',
    'assembly-ai': 'https://www.assemblyai.com/app/account',
    elevenlabs: 'https://elevenlabs.io/app/settings/api-keys',
  };
  return urls[providerId] || '#';
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
export type APIKeysFormData = z.infer<typeof APIKeysSchema>;

export interface APIKeysFormProps {
  /**
   * Initial values for the form
   */
  defaultValues?: Partial<APIKeysFormData>;

  /**
   * Callback when form is submitted
   */
  onSubmit: (data: APIKeysFormData) => void | Promise<void>;

  /**
   * Whether to show the submit button
   * @default true
   */
  showSubmitButton?: boolean;

  /**
   * Custom submit button text
   * @default "Save Settings"
   */
  submitButtonText?: string;

  /**
   * Whether to show action buttons (Back, Skip, etc.)
   * Used in onboarding wizard
   * @default false
   */
  showActionButtons?: boolean;

  /**
   * Callback for back button
   */
  onBack?: () => void;

  /**
   * Callback for skip button
   */
  onSkip?: () => void;

  /**
   * Layout variant: 'compact' for onboarding, 'settings' for settings page
   * @default 'settings'
   */
  variant?: 'compact' | 'settings';

  /**
   * Whether to show the security note
   * @default true
   */
  showSecurityNote?: boolean;
}

export function APIKeysForm({
  defaultValues = {},
  onSubmit,
  showSubmitButton = true,
  submitButtonText = 'Save Settings',
  showActionButtons = false,
  onBack,
  onSkip,
  variant = 'settings',
  showSecurityNote = true,
}: APIKeysFormProps) {
  // Initialize default values for all fields
  const initialValues = useMemo(() => {
    const values: Record<string, string> = {};

    getProvidersWithApiKeys().forEach(provider => {
      const apiKeyField = `${provider.id}_api_key`;
      const baseUrlField = `${provider.id}_base_url`;

      values[apiKeyField] = (defaultValues as Record<string, string>)[apiKeyField] || '';
      values[baseUrlField] = (defaultValues as Record<string, string>)[baseUrlField] || '';
    });

    return values;
  }, [defaultValues]);

  const form = useForm<APIKeysFormData>({
    resolver: zodResolver(APIKeysSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [initialValues, form]);

  const handleSubmit = async (data: APIKeysFormData) => {
    await onSubmit(data);
  };

  const isCompact = variant === 'compact';

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      {/* Provider sections */}
      <div
        className={
          isCompact
            ? 'divide-y divide-zinc-200 bg-white rounded-lg border border-zinc-200 shadow-sm'
            : 'divide-y divide-zinc-400'
        }
      >
        {getProvidersWithApiKeys().map((provider, index) => {
          const apiKeyField = `${provider.id}_api_key`;
          const baseUrlField = `${provider.id}_base_url`;

          if (isCompact) {
            // Compact variant for onboarding
            return (
              <div
                key={provider.id}
                className={`p-6 ${index === 0 ? 'rounded-t-lg' : ''} ${index === getProvidersWithApiKeys().length - 1 ? 'rounded-b-lg' : ''}`}
              >
                {/* Provider header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900">{provider.name}</h3>
                    <a
                      href={getApiKeyUrl(provider.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Get API Key →
                    </a>
                  </div>
                  <p className="text-sm text-zinc-600 mb-3">{provider.description}</p>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Features:</p>
                    <FeaturePills features={provider.features} />
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 gap-6">
                  <FormInput
                    name={apiKeyField as keyof APIKeysFormData}
                    control={form.control}
                    label={`${provider.name} API Key`}
                    type="password"
                    placeholder="Enter your API key"
                    autoComplete="off"
                  />

                  <div>
                    <FormInput
                      name={baseUrlField as keyof APIKeysFormData}
                      control={form.control}
                      label="Custom Base URL (Optional)"
                      type="url"
                      placeholder="https://api.example.com"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Optional: Use a custom API endpoint (e.g., for proxy or custom deployment)
                    </p>
                  </div>
                </div>
              </div>
            );
          } else {
            // Settings page variant
            return (
              <div key={provider.id} className="grid grid-cols-1 gap-x-8 gap-y-8 py-10 md:grid-cols-3">
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
                        name={apiKeyField as keyof APIKeysFormData}
                        control={form.control}
                        label={`${provider.name} API Key`}
                        type="password"
                        placeholder="Enter your API key"
                        autoComplete="off"
                      />

                      <div>
                        <FormInput
                          name={baseUrlField as keyof APIKeysFormData}
                          control={form.control}
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
        })}
      </div>

      {/* Security Note */}
      {showSecurityNote && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>Security Note:</strong> API keys are sensitive credentials. They are stored
            securely and never shared with others.
          </p>
        </div>
      )}

      {/* Action buttons for onboarding */}
      {showActionButtons && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          {onBack && (
            <Button type="button" onClick={onBack} color="default" size="lg" className="w-full sm:w-auto">
              Back
            </Button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors order-2 sm:order-1"
              >
                Skip for now
              </button>
            )}
            {showSubmitButton && (
              <Button
                type="submit"
                color="indigo"
                size="lg"
                className="w-full sm:w-auto order-1 sm:order-2"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Saving...' : submitButtonText}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Submit button for settings page */}
      {!showActionButtons && showSubmitButton && variant === 'settings' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : submitButtonText}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
