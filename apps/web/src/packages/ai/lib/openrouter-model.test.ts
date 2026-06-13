import { describe, expect, it } from 'vitest';

import {
  OPENROUTER_FREE_MODELS,
  OPENROUTER_FREE_STACK,
  OPENROUTER_FREE_STACK_ID,
  openRouterModelArgs,
} from './openrouter-model';

describe('OPENROUTER_FREE_STACK', () => {
  it('derives the id list from the free model entries, in order', () => {
    expect(OPENROUTER_FREE_STACK).toEqual(OPENROUTER_FREE_MODELS.map(m => m.id));
  });

  it('contains only :free model ids', () => {
    for (const id of OPENROUTER_FREE_STACK) {
      expect(id.endsWith(':free')).toBe(true);
    }
  });
});

describe('openRouterModelArgs', () => {
  it('expands the free-stack sentinel into a primary + fallback models with throughput routing', () => {
    const [primary, ...rest] = OPENROUTER_FREE_STACK;

    expect(openRouterModelArgs(OPENROUTER_FREE_STACK_ID)).toEqual({
      id: primary,
      settings: {
        models: rest,
        provider: { sort: 'throughput' },
      },
    });
  });

  it('passes a concrete model id through with no settings', () => {
    expect(openRouterModelArgs('anthropic/claude-haiku-4.5')).toEqual({
      id: 'anthropic/claude-haiku-4.5',
    });
  });
});
