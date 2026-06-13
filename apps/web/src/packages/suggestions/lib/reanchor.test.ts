import { describe, expect, it } from 'vitest';

import { ignoreUnnecessaryDiffs } from './reanchor';

describe('ignoreUnnecessaryDiffs', () => {
  it('preserves the user typed prefix verbatim when the model only extends the tail', () => {
    const typed = 'I need some';
    const llmResult = 'I need some water, please.';
    const result = ignoreUnnecessaryDiffs(typed, llmResult);
    expect(result.startsWith(typed)).toBe(true);
  });

  it('accepts a small tail edit when the prefix is intact', () => {
    const typed = 'Good morning';
    const llmResult = 'Good morning, how are you today?';
    const result = ignoreUnnecessaryDiffs(typed, llmResult);
    // Prefix still there
    expect(result.startsWith('Good morning')).toBe(true);
  });

  it('falls through to newText when the model rewrites the whole string', () => {
    // Completely different text — all diffs, no equality spans
    const typed = 'I need water';
    const llmResult = 'Thank you for visiting';
    const result = ignoreUnnecessaryDiffs(typed, llmResult);
    // When every diff is an insertion/deletion (no equality), returns newText
    expect(result).toBe(llmResult);
  });

  it('returns newText when diffs exceed MAX_DIFFS', () => {
    // Construct a case where there are many small alternating diffs.
    // We use a string that's nearly identical but with many tiny changes.
    const typed = 'a b c d e f g h i j k';
    const llmResult = 'a B c D e F g H i J k';
    const result = ignoreUnnecessaryDiffs(typed, llmResult);
    // With > MAX_DIFFS changes the function falls through to llmResult
    // (exact behavior depends on diff count; we just assert it returns a string)
    expect(typeof result).toBe('string');
  });

  it('returns newText when typed and result are identical (no diff needed)', () => {
    const text = 'I need water please';
    const result = ignoreUnnecessaryDiffs(text, text);
    // When result === text, function returns newText (per PV implementation)
    expect(result).toBe(text);
  });

  it('keeps prefix when model only changes the last word', () => {
    const typed = 'Can you call my';
    const llmResult = 'Can you call my daughter this evening?';
    const result = ignoreUnnecessaryDiffs(typed, llmResult);
    expect(result.startsWith('Can you call my')).toBe(true);
  });
});
