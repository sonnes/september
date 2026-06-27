'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useAccount } from '@/packages/account';
import {
  AI_PROVIDERS,
  AIProvidersSchema,
  completeOpenRouterAuth,
  startOpenRouterAuth,
  useAISettings,
  type AIProvidersFormData,
} from '@/packages/ai';
import { useDebounce } from '@/packages/shared';
import type { Voice } from '@/packages/shared';
import { VoicesList, useSpeechContext } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';

import { ProviderKeyField } from '../provider-key-field';
import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { buildProviderConfig, getProviderDefaultValues } from '../../lib/provider-config';
import { buildAdvancedFinishUpdate, type WritingHelpChoice } from '../../lib/setup-modes';
import {
  type VoiceSetupProvider,
  shouldShowVoiceOptionDescription,
  shouldShowVoiceProviderConfig,
} from '../../lib/voice-setup';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

const VOICE_OPTIONS = ONBOARDING_PRIMARY_COPY.voice.options as readonly {
  id: VoiceSetupProvider;
  title: string;
  description: string;
}[];

const WRITING_OPTIONS: readonly { id: WritingHelpChoice; title: string }[] = [
  { id: 'built-in', title: 'Use built-in (no service)' },
  { id: 'openrouter', title: 'OpenRouter' },
  { id: 'gemini', title: 'Google Gemini' },
];

export function AdvancedFinishStep() {
  const { completeOnboarding, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const { getProviderConfig } = useAISettings();
  const { getProvider } = useSpeechContext();
  const navigate = useNavigate();
  const copy = ONBOARDING_PRIMARY_COPY.finish.advanced;
  const connectCopy = ONBOARDING_PRIMARY_COPY.finish.free;

  const [voiceProvider, setVoiceProvider] = useState<VoiceSetupProvider>('browser');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  // Reflect an already-connected OpenRouter (e.g. after the OAuth redirect).
  const [writingChoice, setWritingChoice] = useState<WritingHelpChoice>(
    account?.ai_providers?.openrouter?.api_key ? 'openrouter' : 'built-in'
  );
  const [isSaving, setIsSaving] = useState(false);

  // OpenRouter writing help connects via OAuth (full-page redirect back to
  // /onboarding?step=4&mode=advanced&code=…); finish the exchange on return.
  const [oauthCode] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('code')
  );
  const exchangedRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!oauthCode || exchangedRef.current || !account) return;
    exchangedRef.current = true;
    (async () => {
      try {
        setIsConnecting(true);
        const key = await completeOpenRouterAuth(oauthCode);
        await updateAccount({
          ai_providers: { ...account.ai_providers, openrouter: { api_key: key } },
        });
        setWritingChoice('openrouter');
        toast.success('Connected to OpenRouter');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect to OpenRouter');
      } finally {
        setIsConnecting(false);
        navigate({ to: '/onboarding', search: { step: 4, mode: 'advanced' }, replace: true });
      }
    })();
  }, [account, oauthCode, navigate, updateAccount]);

  const providerDefaults = useMemo(
    () => getProviderDefaultValues(account?.ai_providers),
    [account?.ai_providers]
  );
  const providerForm = useForm<AIProvidersFormData>({
    resolver: zodResolver(AIProvidersSchema),
    defaultValues: providerDefaults,
  });
  const formValues = providerForm.watch() as Record<string, string | undefined>;

  useEffect(() => {
    providerForm.reset(providerDefaults);
  }, [providerDefaults, providerForm]);

  const hasServiceKey = useCallback(
    (id: VoiceSetupProvider) =>
      id === 'browser' ||
      Boolean(formValues[`${id}_api_key`] || account?.ai_providers?.[id]?.api_key),
    [account?.ai_providers, formValues]
  );

  const showsVoiceConfig = shouldShowVoiceProviderConfig(voiceProvider);
  const needsVoiceConnection = showsVoiceConfig && !hasServiceKey(voiceProvider);
  const canListVoices = !needsVoiceConnection;

  const fetchVoices = useCallback(async () => {
    if (!canListVoices) {
      setVoices([]);
      return;
    }
    try {
      setIsLoading(true);
      const provider = getProvider(voiceProvider);
      if (!provider) {
        setVoices([]);
        return;
      }
      const apiKey = getProviderConfig(voiceProvider)?.api_key;
      const fetched = await provider.listVoices({ search: debouncedSearch, apiKey });
      setVoices(fetched || []);
    } catch (err) {
      console.error('Error fetching voices:', err);
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [canListVoices, debouncedSearch, getProvider, getProviderConfig, voiceProvider]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const handleVoiceProviderChange = (id: VoiceSetupProvider) => {
    setVoiceProvider(id);
    setSelectedVoice(undefined);
    setSearchTerm('');
  };

  const geminiHasKey = Boolean(
    formValues.gemini_api_key || account?.ai_providers?.gemini?.api_key
  );
  const openRouterConnected = Boolean(
    formValues.openrouter_api_key || account?.ai_providers?.openrouter?.api_key
  );

  const handleSubmit = providerForm.handleSubmit(async data => {
    if (!account) return;
    try {
      setIsSaving(true);
      const providers = buildProviderConfig(data);
      await updateAccount(
        buildAdvancedFinishUpdate({
          voiceProvider,
          selectedVoice: selectedVoice
            ? { id: selectedVoice.id, name: selectedVoice.name }
            : undefined,
          writingChoice,
          providers,
          currentSpeech: account.ai_speech,
          currentSuggestions: account.ai_suggestions,
        })
      );
      await completeOnboarding();
    } catch (err) {
      console.error('Error saving advanced setup:', err);
      toast.error('Failed to save your services. Please try again.');
      setIsSaving(false);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <StepShell>
        <StepHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
          onBack={goToPreviousStep}
        />

        {/* Voice */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{copy.voiceLabel}</legend>
          {VOICE_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={voiceProvider === option.id}
              onClick={() => handleVoiceProviderChange(option.id)}
              className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                voiceProvider === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  voiceProvider === option.id ? 'border-primary' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {voiceProvider === option.id && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                  {option.title}
                  {option.id === 'browser' && (
                    <span className="text-xs font-semibold text-primary">Recommended</span>
                  )}
                </span>
                {shouldShowVoiceOptionDescription(option.id, voiceProvider) && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </fieldset>

        {showsVoiceConfig && (
          <ProviderKeyField
            control={providerForm.control}
            provider={AI_PROVIDERS[voiceProvider]}
            hasApiKey={hasServiceKey(voiceProvider)}
          />
        )}

        {canListVoices && (
          <div className="space-y-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto rounded-lg border">
              {isLoading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Loading voices...</p>
                </div>
              ) : voices.length > 0 ? (
                <VoicesList
                  voices={voices}
                  selectedVoiceId={selectedVoice?.id}
                  onSelectVoice={setSelectedVoice}
                />
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No voices found. The selected voice can still use its default.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Writing help */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{copy.writingLabel}</legend>
          {WRITING_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={writingChoice === option.id}
              onClick={() => setWritingChoice(option.id)}
              className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                writingChoice === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  writingChoice === option.id ? 'border-primary' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {writingChoice === option.id && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="text-sm font-semibold">{option.title}</span>
            </button>
          ))}
        </fieldset>

        {writingChoice === 'openrouter' && (
          <div className="border-l border-border pl-5">
            <Button
              type="button"
              size="lg"
              variant={openRouterConnected ? 'outline' : 'default'}
              onClick={() =>
                startOpenRouterAuth(`${window.location.origin}/onboarding?step=4&mode=advanced`)
              }
              disabled={isConnecting}
            >
              {openRouterConnected ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {isConnecting
                ? connectCopy.connectingAction
                : openRouterConnected
                  ? 'Reconnect OpenRouter'
                  : connectCopy.connectAction}
            </Button>
            <p
              className={`mt-2 text-xs ${openRouterConnected ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}`}
            >
              {openRouterConnected ? connectCopy.connectedNote : connectCopy.pendingNote}
            </p>
          </div>
        )}

        {writingChoice === 'gemini' && (
          <ProviderKeyField
            control={providerForm.control}
            provider={AI_PROVIDERS.gemini}
            hasApiKey={geminiHasKey}
          />
        )}

        <StepFooter helper={copy.helper}>
          <Button
            type="submit"
            size="lg"
            disabled={isSaving || providerForm.formState.isSubmitting || !account}
          >
            {isSaving ? 'Saving...' : copy.primaryAction}
          </Button>
        </StepFooter>
      </StepShell>
    </form>
  );
}
