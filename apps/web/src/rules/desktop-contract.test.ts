import { describe, expect, it } from 'vitest';

import { APP_NAV, openingPath } from './app-nav';
import { appendToNote, markdownToVoiceText } from './notes';
import { STEPS, stepsFor } from './onboarding';
import { PANEL_TABS, pressTab } from './panel';
import { exportReason, PRESENT_TONES, presentChunks } from './present';
import { SETTINGS_NAV } from './settings-nav';
import {
  composerAction,
  deleteLastWord,
  filterSpaces,
  newSpaceTitle,
  spaceSlug,
} from './spaces';

describe('the web app uses the desktop rules', () => {
  it('has the same application, setup, and settings destinations', () => {
    expect(APP_NAV.map(item => item.path)).toEqual([
      '/dashboard',
      '/spaces',
      '/voice',
      '/help',
      '/settings',
    ]);
    expect(STEPS.map(item => item.path)).toEqual([
      '/welcome',
      '/profile',
      '/mode',
      '/connect',
      '/finish',
    ]);
    expect(SETTINGS_NAV.map(item => item.path)).toEqual([
      '/settings',
      '/settings/writing',
      '/settings/usage',
    ]);
    expect(stepsFor({ mode: 'free' }).map(item => item.path)).toEqual([
      '/welcome',
      '/profile',
      '/mode',
      '/finish',
    ]);
    expect(openingPath('/spaces/new')).toBe('/dashboard');
  });

  it('keeps the desktop writing and panel behavior', () => {
    expect(spaceSlug('My Family')).toBe('my-family');
    expect(newSpaceTitle([])).toBe('General');
    expect(deleteLastWord('hello there')).toBe('hello ');
    expect(filterSpaces([{ title: 'My Family' }], 'family')).toHaveLength(1);
    expect(composerAction('talk').label).toBe('Speak');
    expect(appendToNote('First', 'Second')).toBe('First\n\nSecond');
    expect(markdownToVoiceText('# Monday\n\nHello')).toBe('Monday Hello');
    expect(PANEL_TABS.map(tab => tab.key)).toEqual(['phrases', 'voice']);
    expect(presentChunks('# Monday\n\nOne. Two.').map(chunk => chunk.role)).toEqual([
      'display',
      'display',
      'support',
    ]);
    expect(PRESENT_TONES.map(tone => tone.key)).toEqual([
      'indigo',
      'ink',
      'paper',
      'cream',
      'sage',
      'blush',
      'sky',
    ]);
    // The browser renders the film, so only the voice can hold this row back.
    expect(exportReason('video', { provider: 'system', voiceId: null, video: true })).toMatch(
      /ElevenLabs/
    );
    expect(pressTab({ open: false, tab: 'phrases' }, 'voice')).toEqual({
      open: true,
      tab: 'voice',
    });
  });
});
