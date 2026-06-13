'use client';

import { Button } from '@september/ui/components/button';
import { Callout } from '@september/ui/components/callout';

import { toast } from 'sonner';

import { useAccount } from '@september/account';
import { SuggestionsForm, type SuggestionsFormData } from '@september/suggestions';

import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

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
    <StepShell>
      <StepHeader
        eyebrow="Step 2 — Suggestions"
        title="AI Suggestions"
        subtitle="Set up AI-powered typing suggestions to help you communicate faster. Tune the AI to match your style."
        onBack={goToPreviousStep}
      />

      {!hasGeminiApiKey && (
        <Callout tone="warning">
          <strong>Note:</strong> AI suggestions require a Gemini API key. You can go back to
          configure it, or skip this step for now.
        </Callout>
      )}

      <SuggestionsForm account={account} onSubmit={onSubmit}>
        {({ form }) => (
          <StepFooter helper="Suggestions are optional — you can enable them later in Settings.">
            <Button type="button" variant="outline" size="lg" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
            </Button>
          </StepFooter>
        )}
      </SuggestionsForm>
    </StepShell>
  );
}
