'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccount } from '@/packages/account';
import {
  type AIProvidersFormData,
  AIProvidersSchema,
  AI_PROVIDERS,
  ProviderSection,
  useAISettings,
} from '@/packages/ai';
import { useDebounce } from '@/packages/shared';
import type { Providers, SpeechConfig, Voice } from '@/packages/shared';
import { VoicesList, useSpeechContext } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import {
  type VoiceSetupProvider,
  shouldShowVoiceOptionDescription,
  shouldShowVoiceProviderConfig,
} from '../../lib/voice-setup';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

type SpeechEngineId = VoiceSetupProvider;

const VOICE_OPTIONS = ONBOARDING_PRIMARY_COPY.voice.options as readonly {
  id: SpeechEngineId;
  title: string;
  description: string;
}[];

function isSpeechEngineId(provider: string | undefined): provider is SpeechEngineId {
  return provider === 'browser' || provider === 'gemini' || provider === 'elevenlabs';
}

function getProviderDefaultValues(account: ReturnType<typeof useAccount>['account']) {
  const values: Record<string, string> = {};
  const providers = account?.ai_providers as Providers | undefined;

  Object.values(AI_PROVIDERS)
    .filter(provider => provider.requires_api_key)
    .forEach(provider => {
      const apiKeyField = `${provider.id}_api_key`;
      const baseUrlField = `${provider.id}_base_url`;
      const providerConfig = providers?.[provider.id];

      values[apiKeyField] = providerConfig?.api_key || '';
      values[baseUrlField] = providerConfig?.base_url || '';
    });

  return values;
}

function buildProviderConfig(data: AIProvidersFormData): Providers {
  const providerConfig: Record<string, { api_key: string; base_url?: string }> = {};

  Object.values(AI_PROVIDERS)
    .filter(provider => provider.requires_api_key)
    .forEach(provider => {
      const apiKeyField = `${provider.id}_api_key` as keyof AIProvidersFormData;
      const baseUrlField = `${provider.id}_base_url` as keyof AIProvidersFormData;
      const apiKey = data[apiKeyField] as string | undefined;
      const baseUrl = data[baseUrlField] as string | undefined;

      if (apiKey) {
        providerConfig[provider.id] = { api_key: apiKey };
        if (baseUrl) {
          providerConfig[provider.id].base_url = baseUrl;
        }
      }
    });

  return providerConfig as Providers;
}

export function SpeechStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const { speechConfig, getProviderConfig } = useAISettings();
  const { getProvider } = useSpeechContext();
  const copy = ONBOARDING_PRIMARY_COPY.voice;

  const [selectedProvider, setSelectedProvider] = useState<SpeechEngineId>(
    isSpeechEngineId(speechConfig.provider) ? speechConfig.provider : 'browser'
  );
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const providerDefaults = useMemo(() => getProviderDefaultValues(account), [account]);
  const providerForm = useForm<AIProvidersFormData>({
    resolver: zodResolver(AIProvidersSchema),
    defaultValues: providerDefaults,
  });
  const formValues = providerForm.watch() as Record<string, string | undefined>;
  const selectedOption = VOICE_OPTIONS.find(option => option.id === selectedProvider);

  useEffect(() => {
    providerForm.reset(providerDefaults);
  }, [providerDefaults, providerForm]);

  useEffect(() => {
    if (speechConfig.voice_id && speechConfig.voice_name) {
      setSelectedVoice({
        id: speechConfig.voice_id,
        name: speechConfig.voice_name,
        language: 'en-US',
      });
    }
  }, [speechConfig.voice_id, speechConfig.voice_name]);

  const hasServiceKey = useCallback(
    (serviceId: SpeechEngineId) =>
      serviceId === 'browser' ||
      Boolean(
        formValues[`${serviceId}_api_key` as keyof AIProvidersFormData] ||
        account?.ai_providers?.[serviceId]?.api_key
      ),
    [account?.ai_providers, formValues]
  );

  const showsProviderConfig = shouldShowVoiceProviderConfig(selectedProvider);
  const needsConnection = showsProviderConfig && !hasServiceKey(selectedProvider);
  const canUseSelectedService = !needsConnection;

  const fetchVoices = useCallback(async () => {
    if (!canUseSelectedService) {
      setVoices([]);
      return;
    }

    try {
      setIsLoading(true);
      const provider = getProvider(selectedProvider);
      if (!provider) {
        setVoices([]);
        return;
      }

      const apiKey = getProviderConfig(selectedProvider)?.api_key;
      const fetchedVoices = await provider.listVoices({ search: debouncedSearchTerm, apiKey });
      setVoices(fetchedVoices || []);
    } catch (err) {
      console.error('Error fetching voices:', err);
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    canUseSelectedService,
    debouncedSearchTerm,
    getProvider,
    getProviderConfig,
    selectedProvider,
  ]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const handleProviderChange = (providerId: SpeechEngineId) => {
    setSelectedProvider(providerId);
    setSelectedVoice(undefined);
    setSearchTerm('');
  };

  const handleSubmit = providerForm.handleSubmit(async data => {
    try {
      setIsSaving(true);

      const nextSpeechConfig: SpeechConfig = {
        ...speechConfig,
        provider: selectedProvider,
        settings: {
          ...(speechConfig.settings ?? {}),
        },
      };

      if (selectedVoice) {
        nextSpeechConfig.voice_id = selectedVoice.id;
        nextSpeechConfig.voice_name = selectedVoice.name;
      }

      await updateAccount({
        ai_providers: buildProviderConfig(data),
        ai_speech: nextSpeechConfig,
      });

      goToNextStep();
    } catch (err) {
      console.error('Error saving voice settings:', err);
      toast.error('Failed to save voice settings. Please try again.');
    } finally {
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Voice</legend>
          {VOICE_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selectedProvider === option.id}
              className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                selectedProvider === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
              onClick={() => handleProviderChange(option.id)}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  selectedProvider === option.id ? 'border-primary' : 'border-border'
                }`}
                aria-hidden="true"
              >
                {selectedProvider === option.id && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
                  {option.title}
                  {option.id === 'browser' && (
                    <span className="text-xs font-semibold text-primary">Recommended</span>
                  )}
                </span>
                {shouldShowVoiceOptionDescription(option.id, selectedProvider) && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </fieldset>

        {showsProviderConfig && (
          <div className="space-y-4 border-l border-border pl-5">
            <div>
              <h2 className="text-sm font-semibold">
                {selectedOption?.title ?? 'Voice service'} connection
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Add or update this service here. Choose the built-in voice to skip extra setup.
              </p>
            </div>
            <div className="[&_[data-slot=card]]:rounded-lg [&_[data-slot=card]]:shadow-none">
              <ProviderSection
                control={providerForm.control}
                provider={AI_PROVIDERS[selectedProvider]}
                hasApiKey={hasServiceKey(selectedProvider)}
              />
            </div>
          </div>
        )}

        {canUseSelectedService && (
          <div className="space-y-4">
            <span className="text-sm font-semibold">Voice options</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search voices..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-lg border">
              {isLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">Loading voices...</p>
                </div>
              ) : voices.length > 0 ? (
                <VoicesList
                  voices={voices}
                  selectedVoiceId={selectedVoice?.id}
                  onSelectVoice={setSelectedVoice}
                />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No voices found. The selected voice service can still use its default.
                </p>
              )}
            </div>
          </div>
        )}

        {selectedVoice && (
          <p className="border-l border-primary/30 pl-5 text-sm">
            <span className="font-medium">Selected:</span> {selectedVoice.name}
            {selectedVoice.gender && (
              <span className="text-muted-foreground"> · {selectedVoice.gender}</span>
            )}
          </p>
        )}

        <StepFooter helper={copy.helper}>
          <Button
            type="submit"
            size="lg"
            disabled={isSaving || providerForm.formState.isSubmitting || needsConnection}
          >
            {isSaving || providerForm.formState.isSubmitting ? 'Saving...' : copy.primaryAction}
          </Button>
        </StepFooter>
      </StepShell>
    </form>
  );
}
