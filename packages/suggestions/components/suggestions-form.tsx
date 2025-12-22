'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getModelsForProvider } from '@/packages/ai';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormCheckbox, FormSelect, FormTextarea } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

import type { Account } from '@/types/account';
import type { AIProvider } from '@/types/ai-config';

import { useCorpus } from '@/packages/suggestions/hooks/use-corpus';
import { type SuggestionsFormData, SuggestionsFormSchema } from '@/packages/suggestions/types';

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

interface SuggestionsFormProps {
  account?: Account;
  onSubmit: (data: SuggestionsFormData) => Promise<void>;
  children?: (props: {
    form: ReturnType<typeof useForm<SuggestionsFormData>>;
    hasApiKey: boolean;
    error: string | null;
    success: boolean;
  }) => React.ReactNode;
}

export function SuggestionsForm({ account, onSubmit, children }: SuggestionsFormProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isGenerating, generateCorpus } = useCorpus();

  const defaultValues = useMemo((): SuggestionsFormData => {
    const suggestionsConfig = account?.ai_suggestions;
    return {
      enabled: suggestionsConfig?.enabled ?? false,
      provider: (suggestionsConfig?.provider as 'gemini') ?? 'gemini',
      model:
        (suggestionsConfig?.model as
          | 'gemini-2.5-flash-lite'
          | 'gemini-2.5-flash'
          | 'gemini-2.5-pro') ?? 'gemini-2.5-flash-lite',
      settings: {
        system_instructions: suggestionsConfig?.settings?.system_instructions ?? '',
        temperature: suggestionsConfig?.settings?.temperature ?? 0.7,
        max_suggestions: suggestionsConfig?.settings?.max_suggestions ?? 3,
        context_window: suggestionsConfig?.settings?.context_window ?? 10,
        ai_corpus: suggestionsConfig?.settings?.ai_corpus ?? '',
      },
    };
  }, [account?.ai_suggestions]);

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to update suggestions settings. Please try again.';
      setError(errorMessage);
    }
  };

  const aiInstructions = form.watch('settings.system_instructions');
  const provider = form.watch('provider');

  const models = useMemo(() => getModelsForProvider(provider as AIProvider), [provider]);

  const hasApiKey = !!account?.ai_providers?.gemini?.api_key;

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
    <div className="space-y-6 sm:space-y-8">
      {/* API Key Warning */}
      {!hasApiKey && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Key Required</AlertTitle>
          <AlertDescription>
            You need to configure your Gemini API key in{' '}
            <a href="/settings/ai" className="underline hover:text-amber-900">
              AI Settings
            </a>{' '}
            to use AI suggestions.
          </AlertDescription>
        </Alert>
      )}

      {/* Enable Toggle */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Enable AI Suggestions</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Turn on AI-powered typing suggestions to help you communicate faster and more
            effectively.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
          <FormCheckbox
            name="enabled"
            control={form.control}
            label="Enable AI Suggestions"
            description="Get intelligent sentence suggestions as you type"
            disabled={!hasApiKey}
          />
        </div>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Model Selection</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Choose the AI model to use for generating suggestions. Lite is fastest, Pro is most
            advanced.
          </p>
        </div>
        <div className="md:col-span-2 px-4">
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
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">System Instructions</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Describe how you want the AI to provide suggestions. Include your communication style,
            common topics, and any personal context.
          </p>
        </div>

        <div className="md:col-span-2 px-4">
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
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                  <h4 className="text-sm font-medium text-zinc-700">Example Instructions</h4>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform ${showExamples ? 'rotate-180' : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-2">
                  {EXAMPLE_INSTRUCTIONS.map(example => (
                    <button
                      key={example.name}
                      type="button"
                      onClick={() => handleExampleClick(example.text)}
                      className="block w-full text-left rounded border border-zinc-200 bg-white p-3 text-sm hover:bg-zinc-50 transition-colors"
                    >
                      <div className="font-medium text-zinc-900 text-sm">{example.name}</div>
                      <div className="mt-1 text-zinc-600 text-sm leading-relaxed">
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
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base/7 font-semibold text-zinc-900">Content Corpus</h2>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Provide examples of your daily life, conversations, and other content that the AI can
            use to provide suggestions.
          </p>
          <p className="mt-1 text-sm/6 text-zinc-600">
            Alternatively, you can generate a corpus from your instructions. This will take a few
            minutes.
          </p>
        </div>

        <div className="md:col-span-2 px-4">
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

  if (children) {
    return (
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {formFields}
        {children({ form, hasApiKey, error, success })}
      </form>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {formFields}
      
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
