'use client';

import { useEffect, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { useAccount } from '@/packages/account';
import { completeOpenRouterAuth, startOpenRouterAuth } from '@/packages/ai';
import { Button } from '@/packages/ui/components/button';
import { Textarea } from '@/packages/ui/components/textarea';
import { CheckCircle2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { buildSuggestionsSetupUpdate } from '../../lib/suggestions-setup';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

type SuggestionsChoice = 'built-in' | 'openrouter';

export function SuggestionsStep() {
  const { completeOnboarding, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const navigate = useNavigate();
  const [oauthCode] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('code')
  );
  const exchangedRef = useRef(false);
  const copy = ONBOARDING_PRIMARY_COPY.suggestions;
  const [choice, setChoice] = useState<SuggestionsChoice>(
    account?.ai_suggestions?.provider === 'openrouter' ? 'openrouter' : 'built-in'
  );
  const [showPersonalWords, setShowPersonalWords] = useState(
    Boolean(account?.ai_suggestions?.settings?.ai_corpus)
  );
  const [personalWords, setPersonalWords] = useState(
    account?.ai_suggestions?.settings?.ai_corpus ?? ''
  );
  const [openRouterKey, setOpenRouterKey] = useState(account?.ai_providers?.openrouter?.api_key);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setPersonalWords(account?.ai_suggestions?.settings?.ai_corpus ?? '');
    setOpenRouterKey(account?.ai_providers?.openrouter?.api_key);
  }, [account?.ai_providers?.openrouter?.api_key, account?.ai_suggestions?.settings?.ai_corpus]);

  useEffect(() => {
    if (!oauthCode || exchangedRef.current || !account) return;
    exchangedRef.current = true;

    (async () => {
      try {
        setIsConnecting(true);
        const key = await completeOpenRouterAuth(oauthCode);
        setChoice('openrouter');
        setOpenRouterKey(key);
        await updateAccount({
          ai_providers: { ...account.ai_providers, openrouter: { api_key: key } },
        });
        toast.success('Connected to OpenRouter');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect to OpenRouter');
      } finally {
        setIsConnecting(false);
        navigate({ to: '/onboarding', search: { step: 4 }, replace: true });
      }
    })();
  }, [account, oauthCode, navigate, updateAccount]);

  const handleConnectOpenRouter = async () => {
    setChoice('openrouter');
    await startOpenRouterAuth(`${window.location.origin}/onboarding?step=4`);
  };

  const handleSubmit = async () => {
    if (!account) return;

    try {
      setIsSaving(true);
      await updateAccount(
        buildSuggestionsSetupUpdate({
          currentSuggestions: account.ai_suggestions,
          currentProviders: account.ai_providers,
          personalWords,
          serviceChoice: choice,
          openRouterApiKey: openRouterKey,
        })
      );
      await completeOnboarding();
    } catch (err) {
      console.error('Error saving suggestions setup:', err);
      toast.error('Failed to save suggestions. Please try again.');
      setIsSaving(false);
    }
  };

  const openRouterSelected = choice === 'openrouter';
  const needsOpenRouterConnection = openRouterSelected && !openRouterKey;

  return (
    <StepShell>
      <StepHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        onBack={goToPreviousStep}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Suggestions</legend>
        <button
          type="button"
          aria-pressed={choice === 'built-in'}
          className={`flex w-full items-start gap-4 border-l-2 px-4 py-3 text-left transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
            choice === 'built-in'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
          onClick={() => setChoice('built-in')}
        >
          <SelectionDot selected={choice === 'built-in'} />
          <span>
            <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
              {copy.options[0].title}
              <span className="text-xs font-semibold text-primary">Recommended</span>
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              {copy.options[0].description}
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={openRouterSelected}
          className={`flex w-full items-start gap-4 border-l-2 px-4 py-3 text-left transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
            openRouterSelected
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
          onClick={() => setChoice('openrouter')}
        >
          <SelectionDot selected={openRouterSelected} />
          <span>
            <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
              {copy.options[1].title}
              {openRouterKey && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              )}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              {copy.options[1].description}
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={showPersonalWords}
          className={`flex w-full items-start gap-4 border-l-2 px-4 py-3 text-left transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
            showPersonalWords
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
          onClick={() => setShowPersonalWords(value => !value)}
        >
          <span
            className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded border ${
              showPersonalWords
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border'
            }`}
            aria-hidden="true"
          >
            {showPersonalWords && <CheckCircle2 className="size-3.5" />}
          </span>
          <span>
            <span className="text-base font-semibold">{copy.options[2].title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              {copy.options[2].description}
            </span>
          </span>
        </button>
      </fieldset>

      {needsOpenRouterConnection && (
        <div className="border-l border-border pl-5">
          <h2 className="text-sm font-semibold">Connect OpenRouter</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You will return here after connecting. Nothing else in setup changes.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-4"
            onClick={handleConnectOpenRouter}
            disabled={isConnecting}
          >
            <LogIn className="mr-2 h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Connect OpenRouter'}
          </Button>
        </div>
      )}

      {showPersonalWords && (
        <div className="border-l border-border pl-5">
          <label htmlFor="onboarding-personal-words" className="text-sm font-semibold">
            Personal words
          </label>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Add notes, documents, memories, names, routines, or phrases September should know.
          </p>
          <Textarea
            id="onboarding-personal-words"
            value={personalWords}
            onChange={event => setPersonalWords(event.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Amma. Dr. Shah. I need a short rest. Please give me a moment."
            className="mt-4"
          />
        </div>
      )}

      <StepFooter
        helper={
          needsOpenRouterConnection
            ? 'Connect OpenRouter or choose built-in suggestions.'
            : copy.helper
        }
      >
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={isSaving || needsOpenRouterConnection || !account}
        >
          {isSaving ? 'Saving...' : copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border ${
        selected ? 'border-primary' : 'border-border'
      }`}
      aria-hidden="true"
    >
      {selected && <span className="size-2.5 rounded-full bg-primary" />}
    </span>
  );
}
