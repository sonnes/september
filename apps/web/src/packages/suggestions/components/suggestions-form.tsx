'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Account } from '@september/account';
import { getModelsForProvider, getProvidersForFeature } from '@september/ai';
import type { AIProvider } from '@september/shared';
import { Alert, AlertDescription, AlertTitle } from '@september/ui/components/alert';
import { Button } from '@september/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@september/ui/components/collapsible';
import { FormCheckbox, FormSelect, FormTextarea } from '@september/ui/components/form';
import { Spinner } from '@september/ui/components/spinner';
import { AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCorpus } from '../hooks/use-corpus';
import { type SuggestionsFormData, SuggestionsFormSchema } from '../types';

const EXAMPLE_INSTRUCTIONS = [
  {
    name: 'ALS Person',
    text: 'I am a person living with ALS. I cannot move or speak. I also work as a software engineer. You should help me with communication. I usually talk about my daily chores, talking to my family, communication during work meetings, etc.',
  },
  {
    name: 'Yoda',
    text: "I'm a wise and knowledgeable Jedi Master who talks like Yoda in Star Wars.",
  },
  {
    name: 'Teenager',
    text: 'I am a Gen Z teenager. You need to use modern slang and emojis. You should also be able to talk about the latest trends in technology, music, and fashion.',
  },
];

export function getSuggestionsFormDefaultValues(account?: Account): SuggestionsFormData {
  const suggestionsConfig = account?.ai_suggestions;
  return {
    enabled: suggestionsConfig?.enabled ?? false,
    provider: suggestionsConfig?.provider ?? 'gemini',
    model: suggestionsConfig?.model ?? 'gemini-2.5-flash-lite',
    settings: {
      system_instructions: suggestionsConfig?.settings?.system_instructions ?? '',
      temperature: suggestionsConfig?.settings?.temperature ?? 0.7,
      max_suggestions: suggestionsConfig?.settings?.max_suggestions ?? 3,
      context_window: suggestionsConfig?.settings?.context_window ?? 10,
      ai_corpus: suggestionsConfig?.settings?.ai_corpus ?? '',
    },
  };
}

interface SuggestionsFormFieldsProps {
  account?: Account;
  form: ReturnType<typeof useForm<SuggestionsFormData>>;
  variant?: 'settings' | 'setup';
  providerKeyAvailable?: (provider: AIProvider) => boolean;
}

interface SuggestionsFormProps {
  account?: Account;
  onSubmit: (data: SuggestionsFormData) => Promise<void>;
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
}: SuggestionsFormFieldsProps) {
  const [showExamples, setShowExamples] = useState(false);
  const { isGenerating, generateCorpus } = useCorpus();

  const aiInstructions = form.watch('settings.system_instructions');
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

  const handleExampleClick = (example: string) => {
    form.setValue('settings.system_instructions', example);
  };

  const handleGenerateCorpus = async () => {
    const corpus = await generateCorpus(aiInstructions || '');
    if (corpus) {
      form.setValue('settings.ai_corpus', corpus);
    }
  };

  const formFields = (
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

      {/* System Instructions */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>System Instructions</h2>
          <p className={sectionDescriptionClass}>
            Describe how you want the AI to provide suggestions. Include your communication style,
            common topics, and any personal context.
          </p>
        </div>

        <div className={sectionControlClass}>
          <div className="max-w-2xl space-y-4">
            <FormTextarea
              name="settings.system_instructions"
              control={form.control}
              placeholder="Describe how you want the AI to provide suggestions..."
              rows={4}
              maxLength={1000}
            />

            {/* Example Instructions (Collapsible) */}
            <Collapsible open={showExamples} onOpenChange={setShowExamples}>
              <div
                className={
                  isSetupVariant
                    ? 'rounded-sm border bg-background p-5'
                    : 'rounded-lg border border-zinc-200 bg-zinc-50 p-4'
                }
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                  <h4
                    className={
                      isSetupVariant
                        ? 'text-sm font-medium text-foreground'
                        : 'text-sm font-medium text-zinc-700'
                    }
                  >
                    Example Instructions
                  </h4>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${showExamples ? 'rotate-180' : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-2">
                  {EXAMPLE_INSTRUCTIONS.map(example => (
                    <button
                      key={example.name}
                      type="button"
                      onClick={() => handleExampleClick(example.text)}
                      className={
                        isSetupVariant
                          ? 'block w-full rounded-sm border bg-background p-4 text-left text-sm transition-colors hover:bg-muted/30'
                          : 'block w-full text-left rounded border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50 transition-colors'
                      }
                    >
                      <div
                        className={
                          isSetupVariant
                            ? 'text-sm font-medium text-foreground'
                            : 'font-medium text-zinc-900 text-sm'
                        }
                      >
                        {example.name}
                      </div>
                      <div
                        className={
                          isSetupVariant
                            ? 'mt-1 text-sm leading-relaxed text-muted-foreground'
                            : 'mt-1 text-zinc-600 text-sm leading-relaxed'
                        }
                      >
                        {example.text}
                      </div>
                    </button>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* AI Corpus Section */}
      <div className={sectionClass}>
        <div className={sectionIntroClass}>
          <h2 className={sectionTitleClass}>Content Corpus</h2>
          <p className={sectionDescriptionClass}>
            Provide examples of your daily life, conversations, and other content that the AI can
            use to provide suggestions.
          </p>
          <p className={sectionDescriptionClass}>
            Alternatively, you can generate a corpus from your instructions. This will take a few
            minutes.
          </p>
        </div>

        <div className={sectionControlClass}>
          <div className="max-w-2xl space-y-4">
            <FormTextarea
              name="settings.ai_corpus"
              control={form.control}
              placeholder="Enter additional knowledge, documents, or context for the AI..."
              rows={6}
              maxLength={5000}
            />

            <div className="flex justify-start">
              <Button
                type="button"
                onClick={handleGenerateCorpus}
                disabled={!hasApiKey || isGenerating}
                variant="outline"
              >
                {isGenerating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {isGenerating ? 'Generating...' : 'Generate Corpus'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return formFields;
}

export function SuggestionsForm({
  account,
  onSubmit,
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
