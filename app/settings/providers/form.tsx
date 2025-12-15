'use client';

import { Button } from '@/components/uix/button';

import { useAccount } from '@/components-v4/account';
import { AIProvidersForm, ProviderSection } from '@/components-v4/settings';
import type { Providers } from '@/types/ai-config';

export default function AISettingsForm() {
  const { account, updateAccount } = useAccount();

  const handleSubmit = async (providers: Providers) => {
    await updateAccount({
      ai_providers: providers,
    });
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Info Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Providers Configuration</h1>
        <p className="text-muted-foreground">
          Configure AI providers to power suggestions, transcription, and voice synthesis.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Security Note:</strong> API keys are sensitive credentials. Never share them with
          others.
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

            {/* Save button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </AIProvidersForm>
    </div>
  );
}
