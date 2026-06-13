'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Account } from '@/packages/account';
import { getModelsForProvider, getProvidersForFeature } from '@/packages/ai';
import type { AIProvider } from '@/packages/shared';
import { Alert, AlertDescription, AlertTitle } from '@/packages/ui/components/alert';
import { Button } from '@/packages/ui/components/button';
import { FormCheckbox, FormSelect } from '@/packages/ui/components/form';
import { Spinner } from '@/packages/ui/components/spinner';
import { TiptapEditor } from '@/packages/editor';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { type SuggestionsFormData, SuggestionsFormSchema } from '../types';

export function getSuggestionsFormDefaultValues(account?: Account): SuggestionsFormData {
  const suggestionsConfig = account?.ai_suggestions;
  return {
    enabled: suggestionsConfig?.enabled ?? false,
    provider: suggestionsConfig?.provider ?? 'gemini',
    model: suggestionsConfig?.model ?? 'gemini-2.5-flash-lite',
    settings: {
      temperature: suggestionsConfig?.settings?.temperature ?? 0.7,
      max_suggestions: suggestionsConfig?.settings?.max_suggestions ?? 3,
      context_window: suggestionsConfig?.settings?.context_window ?? 10,
    },
  };
}

interface SuggestionsFormFieldsProps {
  account?: Account;
  form: ReturnType<typeof useForm<SuggestionsFormData>>;
  variant?: 'settings' | 'setup';
  providerKeyAvailable?: (provider: AIProvider) => boolean;
  onUpdateContext?: (markdown: string) => void;
}

interface SuggestionsFormProps {
  account?: Account;
  onSubmit: (data: SuggestionsFormData) => Promise<void>;
  onUpdateContext?: (markdown: string) => void;
  variant?: 'settings' | 'setup';
  providerKeyAvailable?: (provider: AIProvider) => boolean;
  children?: (props: {
    form: ReturnType<typeof useForm<SuggestionsFormData>>;
    hasApiKey: boolean;
    error: string | null;
    success: boolean;
  }) => React.ReactNode;
}

export function SuggestionsFormFields({
  account,
  form,
  variant = 'settings',
  providerKeyAvailable,
  onUpdateContext,
}: SuggestionsFormFieldsProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const provider = form.watch('provider');

  // Get available suggestions providers from registry
  const suggestionsProviders = useMemo(() => {
    return getProvidersForFeature('ai')
      .map(p => ({
        id: p.id,
        name: p.name,
      }))
      .filter(p => p.id === 'gemini' || p.id === 'webllm' || p.id === 'openrouter');
  }, []);

  const models = useMemo(() => getModelsForProvider(provider as AIProvider), [provider]);

  // Check if provider requires API key and if it's configured
  const hasApiKey = useMemo(() => {
    if (provider === 'webllm') return true; // No API key required for webllm
    if (providerKeyAvailable) return providerKeyAvailable(provider as AIProvider);
    return !!account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
  }, [provider, account, providerKeyAvailable]);

  const isSetupVariant = variant === 'setup';
  const providerName = suggestionsProviders.find(p => p.id === provider)?.name ?? 'AI provider';
  const modelDescription =
    provider === 'gemini'
      ? 'Choose the Gemini model for suggestions. Lite is fastest, Pro is most advanced.'
      : provider === 'openrouter'
        ? 'Choose the OpenRouter model for suggestions. Lite is fastest, larger models are more capable.'
        : 'Choose a WebLLM model for local browser-based suggestions. Smaller models are faster.';
  const formFieldsClass = isSetupVariant ? 'space-y-6' : 'space-y-6 sm:space-y-8';
  const sectionClass = isSetupVariant
    ? 'grid grid-cols-1 gap-5 rounded-sm border bg-muted/30 p-6 md:grid-cols-[15rem_1fr] md:gap-8'
    : 'grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3';
  const sectionIntroClass = isSetupVariant ? 'px-0' : 'px-4 sm:px-0';
  const sectionControlClass = isSetupVariant ? 'px-0' : 'md:col-span-2 px-4';
  const sectionTitleClass = isSetupVariant
    ? 'text-sm font-semibold text-foreground'
    : 'text-base/7 font-semibold text-zinc-900';
  const sectionDescriptionClass = isSetupVariant
    ? 'mt-1 text-xs leading-relaxed text-muted-foreground'
    : 'mt-1 text-sm/6 text-zinc-600';

  const handleContextUpdate = (_html: string, markdown: string) => {
    if (!onUpdateContext) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateContext(markdown);
    }, 500);
  };

  return (
    <div className={formFieldsClass}>
      {/* API Key Warning */}
      {!hasApiKey && provider !== 'webllm' && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription>
            {isSetupVariant ? (
              <>Add a {providerName} key above to enable cloud AI suggestions.</>
            ) : (
              <>
                You need to configure your {providerName} API key in{' '}
                <a href="/settings/providers" className="underline hover:text-amber-900">
                  AI Settings
                </a>{' '}
                to use AI suggestions with {providerName}.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Enable Toggle */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>Enable AI Suggestions</h2>
          <p className={sectionDescriptionClass}>
            Turn on AI-powered typing suggestions to help you communicate faster and more
            effectively.
          </p>
        </div>
        <div className={sectionControlClass}>
          <FormCheckbox
            name="enabled"
            control={form.control}
            label="Enable AI Suggestions"
            description="Get intelligent sentence suggestions as you type"
            disabled={!hasApiKey}
          />
        </div>
      </div>

      {/* Provider Selection */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>AI Provider</h2>
          <p className={sectionDescriptionClass}>
            Choose a cloud LLM provider or browser-local WebLLM for private, no-key suggestions.
          </p>
        </div>
        <div className={sectionControlClass}>
          <FormSelect
            name="provider"
            control={form.control}
            label="Provider"
            options={suggestionsProviders}
            disabled={false}
          />
        </div>
      </div>

      {/* Model Selection */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>Model Selection</h2>
          <p className={sectionDescriptionClass}>{modelDescription}</p>
        </div>
        <div className={sectionControlClass}>
          <FormSelect
            name="model"
            control={form.control}
            label="Model"
            options={models.map(model => ({ id: model.id, name: model.name }))}
            disabled={!hasApiKey}
          />
        </div>
      </div>

      {/* Context */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>Context</h2>
          <p className={sectionDescriptionClass}>
            Personal context that shapes how the AI generates suggestions — your persona, daily
            topics, names, and phrases. Saved automatically.
          </p>
        </div>
        <div className={sectionControlClass}>
          <TiptapEditor
            content={account?.context ?? ''}
            placeholder="- I need some water&#10;- Can you help me"
            onUpdate={handleContextUpdate}
            className="min-h-48"
          />
        </div>
      </div>
    </div>
  );
}

export function SuggestionsForm({
  account,
  onSubmit,
  onUpdateContext,
  variant = 'settings',
  providerKeyAvailable,
  children,
}: SuggestionsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const defaultValues = useMemo(() => getSuggestionsFormDefaultValues(account), [account]);

  const form = useForm<SuggestionsFormData>({
    resolver: zodResolver(SuggestionsFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (data: SuggestionsFormData) => {
    setError(null);
    setSuccess(false);
    try {
      await onSubmit(data);
      setSuccess(true);
      toast.success('Settings Saved');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving suggestions settings:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to update suggestions settings. Please try again.';
      setError(errorMessage);
    }
  };

  const provider = form.watch('provider');
  const hasApiKey = useMemo(() => {
    if (provider === 'webllm') return true;
    if (providerKeyAvailable) return providerKeyAvailable(provider as AIProvider);
    return !!account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
  }, [provider, account, providerKeyAvailable]);

  if (children) {
    return (
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <SuggestionsFormFields
          account={account}
          form={form}
          variant={variant}
          providerKeyAvailable={providerKeyAvailable}
          onUpdateContext={onUpdateContext}
        />
        {children({ form, hasApiKey, error, success })}
      </form>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <SuggestionsFormFields
        account={account}
        form={form}
        variant={variant}
        providerKeyAvailable={providerKeyAvailable}
        onUpdateContext={onUpdateContext}
      />

      {/* Error and Success Messages */}
      <div className="mt-6 flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </form>
  );
}
