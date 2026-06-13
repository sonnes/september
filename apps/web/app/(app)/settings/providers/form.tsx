'use client';

import { useEffect, useRef } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccount } from '@september/account';
import { AIProvidersForm, ProviderSection, completeOpenRouterAuth } from '@september/ai';
import type { Providers } from '@september/shared';
import { Alert, AlertDescription, AlertTitle } from '@september/ui/components/alert';
import { Button } from '@september/ui/components/button';
import { LoadingState } from '@september/ui/components/loading-state';
import { Spinner } from '@september/ui/components/spinner';

export default function AISettingsForm() {
  const { account, updateAccount } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthCode = searchParams.get('code');
  const exchangedRef = useRef(false);

  // Finish "Connect with OpenRouter": on return from the OAuth redirect, exchange
  // the code for a user API key, save it locally, and strip the code from the URL.
  useEffect(() => {
    if (!oauthCode || exchangedRef.current || !account) return;
    exchangedRef.current = true;

    (async () => {
      try {
        const key = await completeOpenRouterAuth(oauthCode);
        await updateAccount({
          ai_providers: { ...account.ai_providers, openrouter: { api_key: key } },
        });
        toast.success('Connected to OpenRouter');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect to OpenRouter');
      } finally {
        router.replace('/settings/providers');
      }
    })();
  }, [oauthCode, account, updateAccount, router]);

  const handleSubmit = async (providers: Providers) => {
    await updateAccount({
      ai_providers: providers,
    });
  };

  if (!account) {
    return <LoadingState variant="inline" label="Loading account settings..." />;
  }

  return (
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

          <div className="flex flex-col gap-4 pt-6 border-t">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-4">
              {success && (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-right-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                {form.formState.isSubmitting ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </div>
        </>
      )}
    </AIProvidersForm>
  );
}
