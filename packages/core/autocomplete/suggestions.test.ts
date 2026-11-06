import { describe, expect, it } from 'vitest';

import { MAX_SUGGESTIONS, applySuggestion, createEngine, suggestionsFor } from './index.ts';

describe('suggestionsFor', () => {
  it('offers nothing for empty text', () => {
    const engine = createEngine();

    expect(suggestionsFor(engine, '')).toEqual([]);
    expect(suggestionsFor(engine, '   ')).toEqual([]);
  });

  it('completes a part-written word, within one stripe', () => {
    const words = suggestionsFor(createEngine(), 'I would like some wat');

    expect(words).toContain('water');
    expect(words.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    expect(suggestionsFor(createEngine(), 'cof').every((word) => word.startsWith('cof'))).toBe(true);
  });

  it('offers a dictionary word that the seed sentences never use', () => {
    expect(suggestionsFor(createEngine(), 'she was hon')).toContain('honest');
  });

  it('offers the next words after a finished word, without sentence marks', () => {
    const words = suggestionsFor(createEngine(), 'I would like ');

    expect(words.length).toBeGreaterThan(0);
    expect(words).not.toContain('<s>');
    expect(words).not.toContain('</s>');
  });

  it('brings back the words of a space in that space', () => {
    const engine = createEngine();
    for (let i = 0; i < 40; i += 1) engine.observe('please pass the stethoscope', 'clinic');

    expect(suggestionsFor(engine, 'please pass the ', 'clinic')).toContain('stethoscope');
  });

  it('learns a tag from sent messages and offers it after the words', () => {
    const engine = createEngine();
    for (let time = 0; time < 5; time++) engine.observe('that is so funny [laughs]', 'space');

    const found = suggestionsFor(engine, 'that is so funny ', 'space');

    expect(found).toContain('[laughs]');
    const words = found.filter((word) => !word.startsWith('['));
    expect(found.slice(0, words.length)).toEqual(words);
  });

  it('never completes a part-written word into a tag', () => {
    const engine = createEngine();
    engine.observe('so funny [laughs]', 'space');

    expect(suggestionsFor(engine, 'so la', 'space')).not.toContain('[laughs]');
  });

  it('treats a typed tag as a finished word', () => {
    expect(suggestionsFor(createEngine(), 'Oh [frustrated sigh]')).not.toContain('sigh]');
  });
});

describe('applySuggestion', () => {
  it('replaces the part-written word and adds a space', () => {
    expect(applySuggestion('I want some wat', 'water')).toBe('I want some water ');
  });

  it('puts a next word after the text', () => {
    expect(applySuggestion('I want some ', 'water')).toBe('I want some water ');
  });

  it('puts a tag after a part-written word and keeps the word', () => {
    expect(applySuggestion('I am so hap', '[laughs]')).toBe('I am so hap [laughs] ');
  });

  it('puts a space between a tag and the next word', () => {
    expect(applySuggestion('Oh [frustrated sigh]', 'fine')).toBe('Oh [frustrated sigh] fine ');
  });
});
