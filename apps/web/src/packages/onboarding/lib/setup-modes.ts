import type { AccountUpdate } from '@/packages/account';
import type {
  Providers,
  SpeechConfig,
  SuggestionsConfig,
  TranscriptionConfig,
} from '@/packages/shared';

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
      'A natural voice runs in your browser after a one-time download.',
      'Nothing you write is ever sent out.',
    ],
  },
  {
    id: 'free',
    accent: 'amber',
    badge: 'Free start',
    title: 'Free AI mode',
    body: 'Free writing help when you want it.',
    bullets: [
      'September may send the current message to OpenRouter, a free AI service, for suggestions.',
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
  currentTranscription?: TranscriptionConfig;
  currentProviders?: Providers;
}

const KOKORO_DEFAULT = { voice_id: 'af_heart', voice_name: 'Heart' };
const WEBLLM_DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const WHISPER_DEFAULT_MODEL = 'onnx-community/whisper-base';

// Privacy mode: on-device only. Kokoro speech (natural voice, one-time model
// download, nothing sent out), and suggestions/transcription preset to the
// local providers but left disabled — enabling either is a single toggle in
// Settings, no key needed. Provider keys are untouched.
export function buildPrivacyModeUpdate({
  currentSpeech,
  currentSuggestions,
  currentTranscription,
  currentProviders,
}: BuildPrivacyModeUpdateParams = {}): Pick<
  AccountUpdate,
  'ai_speech' | 'ai_suggestions' | 'ai_transcription' | 'ai_providers'
> {
  // Keep a Kokoro voice the user already picked; otherwise the default voice.
  const keepKokoroVoice = currentSpeech?.provider === 'kokoro' && currentSpeech.voice_id;

  return {
    ai_speech: {
      ...(currentSpeech ?? DEFAULT_BROWSER_SPEECH),
      enabled: true,
      provider: 'kokoro',
      ...(keepKokoroVoice
        ? { voice_id: currentSpeech!.voice_id, voice_name: currentSpeech!.voice_name }
        : KOKORO_DEFAULT),
    },
    ai_suggestions: {
      // Only stays enabled if it was already running on the local provider.
      enabled: currentSuggestions?.provider === 'webllm' ? currentSuggestions.enabled : false,
      provider: 'webllm',
      model:
        currentSuggestions?.provider === 'webllm' && currentSuggestions.model
          ? currentSuggestions.model
          : WEBLLM_DEFAULT_MODEL,
      settings: { ...(currentSuggestions?.settings ?? {}) },
    },
    ai_transcription: {
      enabled: currentTranscription?.provider === 'whisper' ? currentTranscription.enabled : false,
      provider: 'whisper',
      model: WHISPER_DEFAULT_MODEL,
      settings: { ...(currentTranscription?.settings ?? {}) },
    },
    ai_providers: currentProviders ?? {},
  };
}

interface InferSetupModeParams {
  setup_mode?: SetupMode;
  ai_speech?: SpeechConfig;
  ai_suggestions?: SuggestionsConfig;
  ai_transcription?: TranscriptionConfig;
}

// Which mode the account is in. An explicit choice (saved by Settings → Setup)
// wins; accounts from before the field are matched against what the mode
// builders produce, falling back to advanced.
export function inferSetupMode(account: InferSetupModeParams): SetupMode {
  if (account.setup_mode) return account.setup_mode;

  const speech = account.ai_speech?.provider;
  const suggestions = account.ai_suggestions?.provider;
  const transcription = account.ai_transcription?.provider;

  if (speech === 'kokoro' && suggestions === 'webllm' && transcription === 'whisper') {
    return 'privacy';
  }
  if (speech === 'browser' && suggestions === 'openrouter') {
    return 'free';
  }
  return 'advanced';
}

interface BuildFreeModeUpdateParams {
  currentSpeech?: SpeechConfig;
  currentSuggestions?: SuggestionsConfig;
  currentProviders?: Providers;
}

// Free mode: browser voice plus OpenRouter writing help — mirrors the
// onboarding free finish step. Suggestions only turn on when an OpenRouter key
// is already present; otherwise the provider is preset and connecting the key
// (one click on the Setup page) is the remaining step.
export function buildFreeModeUpdate({
  currentSpeech,
  currentSuggestions,
  currentProviders,
}: BuildFreeModeUpdateParams = {}): Pick<
  AccountUpdate,
  'ai_speech' | 'ai_suggestions' | 'ai_providers'
> {
  const hasKey = Boolean(currentProviders?.openrouter?.api_key);

  return {
    ai_speech: {
      ...(currentSpeech ?? DEFAULT_BROWSER_SPEECH),
      enabled: true,
      provider: 'browser',
    },
    ai_suggestions: {
      enabled: hasKey,
      provider: 'openrouter',
      model:
        currentSuggestions?.provider === 'openrouter' && currentSuggestions.model
          ? currentSuggestions.model
          : 'google/gemini-2.5-flash-lite',
      settings: { ...(currentSuggestions?.settings ?? {}) },
    },
    ai_providers: currentProviders ?? {},
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
