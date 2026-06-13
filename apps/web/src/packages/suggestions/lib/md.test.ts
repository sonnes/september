import { describe, expect, it } from 'vitest';

import { parseMdPhrases } from './md';

describe('parseMdPhrases', () => {
  it('parses dash bullet lines', () => {
    expect(parseMdPhrases('- hello\n- world')).toEqual(['hello', 'world']);
  });

  it('parses asterisk bullet lines', () => {
    expect(parseMdPhrases('* hello\n* world')).toEqual(['hello', 'world']);
  });

  it('parses indented bullets', () => {
    expect(parseMdPhrases('  - indented\n    * also indented')).toEqual([
      'indented',
      'also indented',
    ]);
  });

  it('ignores prose paragraphs', () => {
    expect(parseMdPhrases('This is prose.\nAnother line of prose.')).toEqual([]);
  });

  it('ignores headings', () => {
    expect(parseMdPhrases('# Heading\n## Sub\n- bullet')).toEqual(['bullet']);
  });

  it('ignores blank lines', () => {
    expect(parseMdPhrases('\n\n- hello\n\n- world\n\n')).toEqual(['hello', 'world']);
  });

  it('handles CRLF line endings', () => {
    expect(parseMdPhrases('- hello\r\n- world\r\n')).toEqual(['hello', 'world']);
  });

  it('trims captured text', () => {
    expect(parseMdPhrases('-   lots of spaces   ')).toEqual(['lots of spaces']);
  });

  it('drops empty bullets', () => {
    expect(parseMdPhrases('- \n- hello\n- \n')).toEqual(['hello']);
  });

  it('deduplicates case-insensitively, preserving first occurrence', () => {
    expect(parseMdPhrases('- Hello\n- hello\n- HELLO\n- world')).toEqual(['Hello', 'world']);
  });

  it('returns empty array for empty input', () => {
    expect(parseMdPhrases('')).toEqual([]);
  });

  it('mixed bullets and prose — only returns bullets', () => {
    const md = `Here is some context about this space.

- I need some water
- Can you help me

More prose here.

- Thank you`;
    expect(parseMdPhrases(md)).toEqual(['I need some water', 'Can you help me', 'Thank you']);
  });
});
