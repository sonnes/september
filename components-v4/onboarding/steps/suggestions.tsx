'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';

import {
  SuggestionsForm,
  SuggestionsFormData,
  SuggestionsFormSchema,
} from '@/components/ai/settings/suggestions-form';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/components-v4/account';
import { useAISettings } from '@/components-v4/settings';

import { useOnboarding } from '../context';

export function SuggestionsStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const { suggestionsConfig } = useAISettings();
  const { show, showError } = useToast();

  const defaultValues = useMemo((): SuggestionsFormData => {
    return {
      enabled: suggestionsConfig.enabled ?? false,
      provider: suggestionsConfig.provider ?? 'gemini',
      model:
        (suggestionsConfig.model as
          | 'gemini-2.5-flash-lite'
          | 'gemini-2.5-flash'
          | 'gemini-2.5-pro') ?? 'gemini-2.5-flash-lite',
      settings: {
        system_instructions: suggestionsConfig.settings?.system_instructions ?? '',
        temperature: suggestionsConfig.settings?.temperature ?? 0.7,
        max_suggestions: suggestionsConfig.settings?.max_suggestions ?? 3,
        context_window: suggestionsConfig.settings?.context_window ?? 10,
        ai_corpus: suggestionsConfig.settings?.ai_corpus ?? '',
      },
    };
  }, [suggestionsConfig]);

  const form = useForm<SuggestionsFormData>({
    resolver: zodResolver(SuggestionsFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (data: SuggestionsFormData) => {
    try {
      await updateAccount({
        ai_suggestions: {
          enabled: data.enabled,
          provider: data.provider,
          model: data.model,
          settings: data.settings,
        },
      });

      show({
        title: 'Suggestions Saved',
        message: 'Your AI suggestions settings have been configured.',
      });

      goToNextStep();
    } catch (err) {
      console.error('Error saving suggestions settings:', err);
      showError('Failed to save suggestions settings. Please try again.');
    }
  };

  const handleSkip = () => {
    goToNextStep();
  };

  // Check if Gemini API key is configured
  const hasGeminiApiKey = !!account?.ai_providers?.gemini?.api_key;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Configure AI Suggestions</h2>
        <p className="mt-2 text-muted-foreground">
          Set up AI-powered typing suggestions to help you communicate faster. Customize the AI to
          match your communication style.
        </p>
      </div>

      {!hasGeminiApiKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> AI suggestions require a Gemini API key. You can go back to
            configure it, or skip this step for now.
          </p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SuggestionsForm control={form.control} setValue={form.setValue} watch={form.watch} />

        <div className="flex items-center justify-between pt-8 border-t mt-8">
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
