import type { Account } from '@/packages/account';
import { AI_PROVIDERS, getModelsForProvider } from '@/packages/ai';
import type { SetupMode } from '@/packages/onboarding';
import type { AIProvider } from '@/packages/shared';

export type SettingsFeature = 'voice' | 'writing' | 'listening';

// Which providers each feature page offers, on-device options first. Mirrors
// the schema enums (SpeechConfig / SuggestionsConfig / TranscriptionConfig).
const FEATURE_PROVIDERS: Record<SettingsFeature, readonly AIProvider[]> = {
  voice: ['browser', 'kokoro', 'elevenlabs', 'gemini'],
  writing: ['webllm', 'gemini', 'openrouter'],
  listening: ['whisper', 'gemini', 'openrouter'],
};

export interface FeatureProviderOption {
  id: AIProvider;
  name: string;
  onDevice: boolean;
  /** Keyless providers are always connected; key-based ones need a saved key. */
  connected: boolean;
}

export function featureProviderOptions(
  feature: SettingsFeature,
  account: Pick<Account, 'ai_providers'> | undefined
): FeatureProviderOption[] {
  return FEATURE_PROVIDERS[feature].map(id => {
    const provider = AI_PROVIDERS[id];
    return {
      id,
      name: provider.name,
      onDevice: !provider.requires_api_key,
      connected:
        !provider.requires_api_key ||
        Boolean(account?.ai_providers?.[id as keyof Account['ai_providers']]?.api_key),
    };
  });
}

// The "— chosen by …" note next to the Powered by chip, tying the feature page
// back to the Setup mode decision.
export function poweredByNote(mode: SetupMode): string {
  if (mode === 'privacy') return '— chosen by your Privacy mode.';
  if (mode === 'free') return '— chosen by your Free AI mode.';
  return '— your choice.';
}

export function defaultModelFor(provider: AIProvider): string | undefined {
  return getModelsForProvider(provider)[0]?.id;
}
