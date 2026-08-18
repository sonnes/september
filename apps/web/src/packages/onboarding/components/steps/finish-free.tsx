'use client';

import { useEffect, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import {
  AI_PROVIDERS,
  completeOpenRouterAuth,
  isOpenRouterOAuthAvailable,
  startOpenRouterAuth,
} from '@/packages/ai';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';
import { Label } from '@/packages/ui/components/label';
import { CheckCircle2, ExternalLink, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { buildSuggestionsSetupUpdate } from '../../lib/suggestions-setup';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

const CALLBACK_QUERY = '/onboarding?step=4&mode=free';

export function FreeFinishStep() {
  const { completeOnboarding, goToPreviousStep, setMode } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const navigate = useNavigate();
  const copy = ONBOARDING_PRIMARY_COPY.finish.free;
  const oauthAvailable = isOpenRouterOAuthAvailable();

  const [oauthCode] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('code')
  );
  const exchangedRef = useRef(false);
  const [openRouterKey, setOpenRouterKey] = useState(account?.ai_providers?.openrouter?.api_key);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOpenRouterKey(account?.ai_providers?.openrouter?.api_key);
  }, [account?.ai_providers?.openrouter?.api_key]);

  // Complete the OAuth round-trip when we return with a code in the URL.
  useEffect(() => {
    if (!oauthAvailable || !oauthCode || exchangedRef.current || !account) return;
    exchangedRef.current = true;

    (async () => {
      try {
        setIsConnecting(true);
        const key = await completeOpenRouterAuth(oauthCode);
        setOpenRouterKey(key);
        await updateAccount({
          ai_providers: { ...account.ai_providers, openrouter: { api_key: key } },
        });
        toast.success('Connected to OpenRouter');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect to OpenRouter');
      } finally {
        setIsConnecting(false);
        navigate({ to: '/onboarding', search: { step: 4, mode: 'free' }, replace: true });
      }
    })();
  }, [account, oauthAvailable, oauthCode, navigate, updateAccount]);

  const handleConnect = async () => {
    await startOpenRouterAuth(`${window.location.origin}${CALLBACK_QUERY}`);
  };

  const handleSubmit = async () => {
    if (!account) return;
    try {
      setIsSaving(true);
      const suggestions = buildSuggestionsSetupUpdate({
        currentSuggestions: account.ai_suggestions,
        currentProviders: account.ai_providers,
        serviceChoice: 'openrouter',
        openRouterApiKey: openRouterKey,
      });
      await updateAccount({
        ...suggestions,
        ai_speech: {
          ...(account.ai_speech ?? { enabled: true, provider: 'browser', settings: {} }),
          enabled: true,
          provider: 'browser',
        },
      });
      await completeOnboarding();
    } catch {
      setIsSaving(false);
    }
  };

  const connected = Boolean(openRouterKey);

  return (
    <StepShell>
      <StepHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={
          oauthAvailable
            ? copy.subtitle
            : 'Create an OpenRouter key in your browser, then paste it here.'
        }
        onBack={goToPreviousStep}
      />

      <div className="border-l border-border pl-5">
        <h2 className="text-sm font-semibold">{copy.connectTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {oauthAvailable
            ? copy.connectBody
            : 'OpenRouter provides the free writing models. Create a key, copy it, and paste it below.'}
        </p>
        {oauthAvailable ? (
          <Button
            type="button"
            size="lg"
            variant={connected ? 'outline' : 'default'}
            className="mt-4"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {connected ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {isConnecting
              ? copy.connectingAction
              : connected
                ? 'Reconnect OpenRouter'
                : copy.connectAction}
          </Button>
        ) : (
          <div className="mt-4 flex max-w-md flex-col gap-3">
            <Button asChild type="button" size="lg" variant="outline">
              <a
                href={AI_PROVIDERS.openrouter.api_key_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Create OpenRouter key
              </a>
            </Button>
            <div className="flex flex-col gap-2">
              <Label htmlFor="desktop-openrouter-key">OpenRouter API key</Label>
              <Input
                id="desktop-openrouter-key"
                type="password"
                value={openRouterKey ?? ''}
                onChange={event => setOpenRouterKey(event.target.value.trim())}
                placeholder="Paste your key"
                autoComplete="off"
              />
            </div>
          </div>
        )}
        <p className={`mt-3 text-sm ${connected ? 'font-medium text-emerald-700' : 'text-muted-foreground'}`}>
          {connected ? copy.connectedNote : copy.pendingNote}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMode('privacy')}
        className="flex w-full items-start gap-4 rounded-lg border-l-2 border-border px-4 py-3 text-left transition-all outline-none hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span>
          <span className="block text-sm font-semibold">{copy.fallbackTitle}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            {copy.fallbackBody}
          </span>
        </span>
      </button>

      <StepFooter helper={copy.helper}>
        <Button size="lg" onClick={handleSubmit} disabled={!connected || isSaving || !account}>
          {isSaving ? 'Saving...' : copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
