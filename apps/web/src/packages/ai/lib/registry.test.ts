import { describe, expect, it } from 'vitest';

import { DEFAULT_SUGGESTIONS_CONFIG } from './defaults';
import { OPENROUTER_FREE_MODELS, OPENROUTER_FREE_STACK_ID } from './openrouter-model';
import { getModelsForProvider } from './registry';

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
