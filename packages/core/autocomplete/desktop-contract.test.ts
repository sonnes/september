import { describe, expect, it } from 'vitest';

import {
  MAX_SUGGESTIONS,
  applySuggestion,
  createEngine,
  suggestionsFor,
} from './index.ts';

describe('desktop autocomplete contract', () => {
  it('offers at most one desktop stripe of words', () => {
    const suggestions = suggestionsFor(createEngine(), 'hel');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });

  it('replaces a partial word and leaves a trailing space', () => {
    expect(applySuggestion('please hel', 'help')).toBe('please help ');
  });
});
