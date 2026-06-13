import { describe, expect, it } from 'vitest';

import { buildSuggestionsSetupUpdate } from './suggestions-setup';

describe('buildSuggestionsSetupUpdate', () => {
  it('keeps the built-in path simple and preserves existing settings', () => {
    const update = buildSuggestionsSetupUpdate({
      currentSuggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: { temperature: 0.3 },
      },
      currentProviders: { gemini: { api_key: 'gemini-key' } },
      serviceChoice: 'built-in',
    });

    expect(update).toEqual({
      ai_providers: { gemini: { api_key: 'gemini-key' } },
      ai_suggestions: {
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        settings: {
          temperature: 0.3,
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
      serviceChoice: 'openrouter',
      openRouterApiKey: 'openrouter-key',
    });

    expect(update).toEqual({
      ai_providers: { openrouter: { api_key: 'openrouter-key' } },
      ai_suggestions: {
        enabled: true,
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash-lite',
        settings: {},
      },
    });
  });
});
