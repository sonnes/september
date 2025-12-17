'use client';

import { CheckCircle2, ExternalLink, Key } from 'lucide-react';
import { Control } from 'react-hook-form';

import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';

import type { AIFeature, AIServiceProvider } from '@/types/ai-config';

import type { AIProvidersFormData } from './schemas';

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

interface ProviderSectionProps {
  control: Control<AIProvidersFormData>;
  provider: AIServiceProvider;
  hasApiKey?: boolean;
}

export function ProviderSection({ control, provider, hasApiKey = false }: ProviderSectionProps) {
  const apiKeyField = `${provider.id}_api_key`;
  const baseUrlField = `${provider.id}_base_url`;

  if (!provider.requires_api_key) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.5fr]">
          {/* Left Column - Provider Info */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  <div className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Ready to Use
                  </div>
                </div>
                <CardDescription className="mt-1 text-sm">{provider.description}</CardDescription>
              </div>
            </div>
            <FeaturePills features={provider.features} />
          </div>

          {/* Right Column - Content */}
          <div className="flex items-center">
            <p className="text-sm text-muted-foreground">
              This provider is available immediately and doesn&apos;t require any configuration.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={hasApiKey ? 'border-green-200 bg-green-50/50' : ''}>
      <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.5fr]">
        {/* Left Column - Provider Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{provider.name}</CardTitle>
                {hasApiKey && (
                  <div className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Configured
                  </div>
                )}
              </div>
              <CardDescription className="mt-1 text-sm">{provider.description}</CardDescription>
            </div>
          </div>
          <FeaturePills features={provider.features} />
          {provider.api_key_url && (
            <a
              href={provider.api_key_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Get API Key
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Right Column - Form Fields */}
        <div className="space-y-4">
          <FormField
            name={apiKeyField as keyof AIProvidersFormData}
            control={control}
            label="API Key"
            type="password"
            placeholder="Enter your API key"
            autoComplete="off"
          />

          <FormField
            name={baseUrlField as keyof AIProvidersFormData}
            control={control}
            label="Custom Base URL (Optional)"
            type="url"
            placeholder="https://api.example.com"
          />
        </div>
      </div>
    </Card>
  );
}
