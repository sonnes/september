import type { AccountUpdate } from '@/packages/account';
import type { Providers, SuggestionsConfig } from '@/packages/shared';

export type SuggestionsServiceChoice = 'built-in' | 'openrouter';

interface BuildSuggestionsSetupUpdateParams {
  currentSuggestions?: SuggestionsConfig;
  currentProviders?: Providers;
  personalWords: string;
  serviceChoice: SuggestionsServiceChoice;
  openRouterApiKey?: string;
}

const DEFAULT_SUGGESTIONS: SuggestionsConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {},
};

export function buildSuggestionsSetupUpdate({
  currentSuggestions,
  currentProviders,
  personalWords,
  serviceChoice,
  openRouterApiKey,
}: BuildSuggestionsSetupUpdateParams): Pick<AccountUpdate, 'ai_providers' | 'ai_suggestions'> {
  const existing = currentSuggestions ?? DEFAULT_SUGGESTIONS;
  const trimmedPersonalWords = personalWords.trim();
  const settings = {
    ...(existing.settings ?? {}),
    ...(trimmedPersonalWords ? { ai_corpus: trimmedPersonalWords } : {}),
  };

  if (serviceChoice === 'openrouter' && openRouterApiKey) {
    return {
      ai_providers: {
        ...(currentProviders ?? {}),
        openrouter: { api_key: openRouterApiKey },
      },
      ai_suggestions: {
        enabled: true,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash-lite',
        settings,
      },
    };
  }

  return {
    ai_providers: currentProviders ?? {},
    ai_suggestions: {
      enabled: existing.enabled,
      provider: existing.provider,
      model: existing.model,
      settings,
    },
  };
}
