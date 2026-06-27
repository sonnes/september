import type { AccountUpdate } from '@/packages/account';
import type { Providers, SpeechConfig, SuggestionsConfig } from '@/packages/shared';

import { buildSuggestionsSetupUpdate } from './suggestions-setup';

export type SetupMode = 'privacy' | 'free' | 'advanced';

export type SetupModeAccent = 'emerald' | 'amber' | 'sky';

export interface SetupModeContent {
  id: SetupMode;
  accent: SetupModeAccent;
  badge: string;
  title: string;
  body: string;
  bullets: readonly string[];
}

// Shared source of truth for the three setup modes — used by the onboarding
// "Choose setup" step and the marketing setup-choices section. Styling per mode
// is mapped from `accent` at the call site; the copy lives here once.
export const SETUP_MODES: readonly SetupModeContent[] = [
  {
    id: 'privacy',
    accent: 'emerald',
    badge: 'Most private',
    title: 'Privacy mode',
    body: 'The most private option. No AI service needed.',
    bullets: [
      'Everything stays on this device.',
      'Use saved phrases and browser speech.',
      'Nothing is sent out for suggestions.',
    ],
  },
  {
    id: 'free',
    accent: 'amber',
    badge: 'Free start',
    title: 'Free AI mode',
    body: 'Use OpenRouter, a free AI option, for writing help.',
    bullets: [
      'September may send the current message to OpenRouter for suggestions.',
      'Spaces and saved phrases still stay on this device.',
      'Good when you want help writing longer replies.',
    ],
  },
  {
    id: 'advanced',
    accent: 'sky',
    badge: 'Advanced',
    title: 'Use your own services',
    body: 'For people or caregivers who already have voice or AI accounts.',
    bullets: [
      'Add your own Gemini, OpenRouter, or ElevenLabs access key.',
      'Choose the voice or writing helper you prefer.',
      'September contacts only the services you choose.',
    ],
  },
];

export function isSetupMode(value: unknown): value is SetupMode {
  return value === 'privacy' || value === 'free' || value === 'advanced';
}

const DEFAULT_BROWSER_SPEECH: SpeechConfig = {
  enabled: true,
  provider: 'browser',
  settings: {},
};

interface BuildPrivacyModeUpdateParams {
  currentSpeech?: SpeechConfig;
  currentSuggestions?: SuggestionsConfig;
  currentProviders?: Providers;
}

// Privacy mode: on-device only. Browser speech, suggestions left disabled
// (built-in path), and provider keys untouched.
export function buildPrivacyModeUpdate({
  currentSpeech,
  currentSuggestions,
  currentProviders,
}: BuildPrivacyModeUpdateParams = {}): Pick<
  AccountUpdate,
  'ai_speech' | 'ai_suggestions' | 'ai_providers'
> {
  const suggestions = buildSuggestionsSetupUpdate({
    currentSuggestions,
    currentProviders,
    serviceChoice: 'built-in',
  });

  return {
    ai_speech: {
      ...(currentSpeech ?? DEFAULT_BROWSER_SPEECH),
      enabled: true,
      provider: 'browser',
    },
    ...suggestions,
  };
}

export type WritingHelpChoice = 'built-in' | 'openrouter' | 'gemini';

interface BuildAdvancedFinishUpdateParams {
  voiceProvider: SpeechConfig['provider'];
  selectedVoice?: { id: string; name: string };
  writingChoice: WritingHelpChoice;
  providers: Providers;
  currentSpeech?: SpeechConfig;
  currentSuggestions?: SuggestionsConfig;
}

// Advanced mode: apply the user's own voice + writing-help choices and the keys
// they entered. `providers` is already built from the key form via
// buildProviderConfig.
export function buildAdvancedFinishUpdate({
  voiceProvider,
  selectedVoice,
  writingChoice,
  providers,
  currentSpeech,
  currentSuggestions,
}: BuildAdvancedFinishUpdateParams): Pick<
  AccountUpdate,
  'ai_speech' | 'ai_suggestions' | 'ai_providers'
> {
  const settings = { ...(currentSuggestions?.settings ?? {}) };

  // Only enable a writing service when its key is actually present, so a
  // selected-but-unconfigured service can't leave suggestions broken.
  const hasKey = writingChoice !== 'built-in' && Boolean(providers[writingChoice]?.api_key);
  const effectiveChoice = hasKey ? writingChoice : 'built-in';

  const ai_suggestions: SuggestionsConfig =
    effectiveChoice === 'openrouter'
      ? { enabled: true, provider: 'openrouter', model: 'google/gemini-2.5-flash-lite', settings }
      : effectiveChoice === 'gemini'
        ? { enabled: true, provider: 'gemini', model: 'gemini-2.5-flash-lite', settings }
        : {
            enabled: false,
            provider: currentSuggestions?.provider ?? 'gemini',
            model: currentSuggestions?.model ?? 'gemini-2.5-flash-lite',
            settings,
          };

  return {
    ai_providers: providers,
    ai_speech: {
      ...(currentSpeech ?? DEFAULT_BROWSER_SPEECH),
      enabled: true,
      provider: voiceProvider,
      ...(selectedVoice ? { voice_id: selectedVoice.id, voice_name: selectedVoice.name } : {}),
    },
    ai_suggestions,
  };
}
