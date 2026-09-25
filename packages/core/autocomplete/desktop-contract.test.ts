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

describe('audio tags in the word engine', () => {
  it('learns a tag from sent messages and offers it after the words', () => {
    const engine = createEngine();
    for (let time = 0; time < 5; time++) {
      engine.observe('that is so funny [laughs]', { chatId: 'space' });
    }

    const found = suggestionsFor(engine, 'that is so funny ', 'space');

    expect(found).toContain('[laughs]');
    const words = found.filter(word => !word.startsWith('['));
    expect(found.slice(0, words.length)).toEqual(words);
  });

  it('never completes a part-written word into a tag', () => {
    const engine = createEngine();
    engine.observe('so funny [laughs]', { chatId: 'space' });

    expect(suggestionsFor(engine, 'so la', 'space')).not.toContain('[laughs]');
  });

  it('puts a tag after a part-written word and keeps the word', () => {
    expect(applySuggestion('I am so hap', '[laughs]')).toBe('I am so hap [laughs] ');
  });

  it('treats a typed tag as a finished word', () => {
    expect(applySuggestion('Oh [frustrated sigh]', 'fine')).toBe('Oh [frustrated sigh] fine ');
    expect(suggestionsFor(createEngine(), 'Oh [frustrated sigh]')).not.toContain('sigh]');
  });
});
