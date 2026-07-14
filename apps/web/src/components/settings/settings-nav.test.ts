import { describe, expect, it } from 'vitest';

import { SETTINGS_SECTIONS } from './settings-nav';

describe('settings nav', () => {
  it('leads with Setup and ends with Account', () => {
    expect(SETTINGS_SECTIONS[0]?.title).toBe('Setup');
    expect(SETTINGS_SECTIONS.at(-1)?.title).toBe('Account');
  });

  it('uses user vocabulary for the feature sections', () => {
    expect(SETTINGS_SECTIONS.map(s => s.title)).toEqual([
      'Setup',
      'Voice',
      'Writing help',
      'Listening',
      'Account',
    ]);
  });

  it('routes each section to the new paths', () => {
    expect(SETTINGS_SECTIONS.map(s => s.href)).toEqual([
      '/settings',
      '/settings/voice',
      '/settings/writing',
      '/settings/listening',
      '/settings/account',
    ]);
  });

  it('keeps section copy free of jargon', () => {
    const copy = SETTINGS_SECTIONS.flatMap(s => [s.title, s.description]).join('\n');
    expect(copy).not.toMatch(/\b(API key|provider|LLM|transcription)\b/i);
  });
});
