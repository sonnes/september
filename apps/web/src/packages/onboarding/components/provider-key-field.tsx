'use client';

import type { Control } from 'react-hook-form';

import type { AIProvidersFormData } from '@/packages/ai';
import type { AIServiceProvider } from '@/packages/shared';
import { FormField } from '@/packages/ui/components/form';
import { ExternalLink } from 'lucide-react';

interface ProviderKeyFieldProps {
  control: Control<AIProvidersFormData>;
  provider: AIServiceProvider;
  hasApiKey?: boolean;
}

// Onboarding-styled key entry: a calm left-accent section matching the rest of
// the flow, instead of the heavier card/pills ProviderSection used in Settings.
export function ProviderKeyField({ control, provider, hasApiKey = false }: ProviderKeyFieldProps) {
  return (
    <div className="space-y-2 border-l border-border pl-5">
      <div className="flex items-center gap-2 text-sm">
        <span className="shrink-0 font-semibold">{provider.name}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{provider.description}</span>
        {hasApiKey && (
          <span className="shrink-0 text-xs font-semibold text-emerald-700">Saved</span>
        )}
        {provider.api_key_url && (
          <a
            href={provider.api_key_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Get a key
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <FormField
        name={`${provider.id}_api_key` as keyof AIProvidersFormData}
        control={control}
        label="API key"
        type="password"
        placeholder="Paste your key"
        autoComplete="off"
      />
    </div>
  );
}
