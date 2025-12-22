'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useAccount } from '@/components/account';
import { AIProvidersForm, ProviderSection } from '@/packages/ai';
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
        <Spinner className="h-6 w-6 text-zinc-500" />
        <span className="ml-2 text-sm text-zinc-500">Loading account settings...</span>
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

      <Alert variant="warning" className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Security Note</AlertTitle>
        <AlertDescription className="text-amber-700">
          API keys are sensitive credentials. Never share them with others.
        </AlertDescription>
      </Alert>

      <AIProvidersForm account={account} onSubmit={handleSubmit}>
        {({ form, allProviders, hasApiKey, error, success }) => (
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

            {/* Error and Success Messages next to action button */}
            <div className="flex flex-col gap-4 pt-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center justify-end gap-4">
                {success && (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-right-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Settings saved!</span>
                  </div>
                )}
                
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </>
        )}
      </AIProvidersForm>
    </div>
  );
}
