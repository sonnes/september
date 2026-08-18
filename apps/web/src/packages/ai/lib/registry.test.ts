import { describe, expect, it } from 'vitest';

import { DEFAULT_SUGGESTIONS_CONFIG } from './defaults';
import { OPENROUTER_FREE_MODELS, OPENROUTER_FREE_STACK_ID } from './openrouter-model';
import {
  createAIProviderRegistry,
  getModelsForProvider,
  resolveAvailableProvider,
} from './registry';

describe('desktop provider registry', () => {
  it('keeps remote providers and removes browser-local model providers', () => {
    const providers = createAIProviderRegistry(false);

    expect(Object.keys(providers)).toEqual(['browser', 'gemini', 'openrouter', 'elevenlabs']);
    expect(providers.webllm).toBeUndefined();
    expect(providers.whisper).toBeUndefined();
    expect(providers.kokoro).toBeUndefined();
  });

  it('falls back when saved account data names an unavailable local provider', () => {
    const providers = createAIProviderRegistry(false);

    expect(resolveAvailableProvider('webllm', 'ai', 'openrouter', providers)).toBe('openrouter');
    expect(resolveAvailableProvider('whisper', 'transcription', 'gemini', providers)).toBe(
      'gemini'
    );
    expect(resolveAvailableProvider('kokoro', 'speech', 'browser', providers)).toBe('browser');
    expect(resolveAvailableProvider('openrouter', 'ai', 'gemini', providers)).toBe('openrouter');
  });
});

describe('openrouter registry models', () => {
  const ids = getModelsForProvider('openrouter').map(m => m.id);

  it('lists the free-stack sentinel first', () => {
    expect(ids[0]).toBe(OPENROUTER_FREE_STACK_ID);
  });

  it('includes every free model individually', () => {
    for (const model of OPENROUTER_FREE_MODELS) {
      expect(ids).toContain(model.id);
    }
  });

  it('keeps the existing paid models available', () => {
    expect(ids).toContain('anthropic/claude-haiku-4.5');
  });
});

describe('DEFAULT_SUGGESTIONS_CONFIG', () => {
  it('defaults to the free OpenRouter stack but stays disabled until opted in', () => {
    expect(DEFAULT_SUGGESTIONS_CONFIG.provider).toBe('openrouter');
    expect(DEFAULT_SUGGESTIONS_CONFIG.model).toBe(OPENROUTER_FREE_STACK_ID);
    expect(DEFAULT_SUGGESTIONS_CONFIG.enabled).toBe(false);
  });
});
