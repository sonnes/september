import { describe, expect, it } from 'vitest';

import { buildSuggestionsSetupUpdate } from './suggestions-setup';

describe('buildSuggestionsSetupUpdate', () => {
  it('keeps the built-in path simple and stores personal words', () => {
    const update = buildSuggestionsSetupUpdate({
      currentSuggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: { system_instructions: 'Warm and direct.', temperature: 0.3 },
      },
      currentProviders: { gemini: { api_key: 'gemini-key' } },
      personalWords: 'Amma\nDr. Shah',
      serviceChoice: 'built-in',
    });

    expect(update).toEqual({
      ai_providers: { gemini: { api_key: 'gemini-key' } },
      ai_suggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: {
          system_instructions: 'Warm and direct.',
          temperature: 0.3,
          ai_corpus: 'Amma\nDr. Shah',
        },
      },
    });
  });

  it('enables OpenRouter suggestions when a key is connected', () => {
    const update = buildSuggestionsSetupUpdate({
      currentSuggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: {},
      },
      currentProviders: {},
      personalWords: 'I need a short rest.',
      serviceChoice: 'openrouter',
      openRouterApiKey: 'openrouter-key',
    });

    expect(update).toEqual({
      ai_providers: { openrouter: { api_key: 'openrouter-key' } },
      ai_suggestions: {
        enabled: true,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash-lite',
        settings: { ai_corpus: 'I need a short rest.' },
      },
    });
  });
});
