'use client';

import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useAccount } from '@/components/account';
import { AIProvidersForm, ProviderSection } from '@/components/settings';
import type { Providers } from '@/types/ai-config';

import { useOnboarding } from '../../context';

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
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">AI Providers</h2>
        <p className="mt-2 text-muted-foreground">
          Configure AI providers to power suggestions, transcription, and voice synthesis. Some
          providers are ready to use immediately, while others require API keys.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> September works with browser-based speech without any API keys. Add
          API keys to unlock AI-powered features like intelligent suggestions and high-quality voice
          synthesis.
        </p>
      </div>

      <AIProvidersForm account={account} onSubmit={handleSubmit}>
        {({ form, allProviders, hasApiKey }) => (
          <>
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

            <div className="flex items-center justify-between pt-4">
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
          </>
        )}
      </AIProvidersForm>
    </div>
  );
}

