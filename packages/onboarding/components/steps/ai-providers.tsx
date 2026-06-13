'use client';

import { Button } from '@september/ui/components/button';
import { Callout } from '@september/ui/components/callout';

import { useAccount } from '@september/account';
import { AIProvidersForm, ProviderSection } from '@september/ai';
import type { Providers } from '@september/shared';

import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

export function AIProvidersStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (providers: Providers) => {
    await updateAccount({
      ai_providers: providers,
    });
    goToNextStep();
  };

  const handleSkip = () => {
    goToNextStep();
  };

  return (
    <AIProvidersForm account={account} onSubmit={handleSubmit}>
      {({ form, allProviders, hasApiKey }) => (
        <StepShell>
          <StepHeader
            eyebrow="Step 1 — AI"
            title="AI Providers"
            subtitle="Connect AI providers to power suggestions, transcription, and voice synthesis. Some work right away; others need an API key."
            onBack={goToPreviousStep}
          />

          <Callout tone="info">
            <strong>Tip:</strong> September works with browser-based speech without any API keys. Add
            API keys to unlock AI-powered features like intelligent suggestions and high-quality
            voice synthesis.
          </Callout>

          <div className="space-y-4">
            {Object.values(allProviders).map(provider => (
              <ProviderSection
                key={provider.id}
                control={form.control}
                provider={provider}
                hasApiKey={hasApiKey(provider.id)}
              />
            ))}
          </div>

          <StepFooter helper="You can change providers any time in Settings.">
            <Button type="button" variant="outline" size="lg" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save & Continue'}
            </Button>
          </StepFooter>
        </StepShell>
      )}
    </AIProvidersForm>
  );
}
