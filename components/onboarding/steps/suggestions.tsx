'use client';

import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { toast } from 'sonner';

import { useAccount } from '@/components/account';
import { SuggestionsForm, type SuggestionsFormData } from '@/packages/suggestions';

import { useOnboarding } from '../context';

export function SuggestionsStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();

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

      toast.success('Suggestions Saved', {
        description: 'Your AI suggestions settings have been configured.',
      });

      goToNextStep();
    } catch (err) {
      console.error('Error saving suggestions settings:', err);
      toast.error('Failed to save suggestions settings. Please try again.');
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

      <SuggestionsForm account={account} onSubmit={onSubmit}>
        {({ form }) => (
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
        )}
      </SuggestionsForm>
    </div>
  );
}
