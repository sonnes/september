import { describe, expect, it, vi } from 'vitest';

import {
  currentSetup,
  currentUserId,
  heardVoices,
  LOCAL_USER,
  loadSettings,
  readTalkDraft,
  readTalkMood,
  saveSetup,
  saveTalkDraft,
  saveTalkMood,
  subscribeSetup,
  systemName,
  updateSetup,
} from '@september/app-ui/services/settings';
import { DEFAULT_DRAFT } from '@september/core/rules/onboarding';

import { platform, rows } from '../test/platform';

describe('the setup', () => {
  it('reads an older setup with its new switches on, and keeps each change', async () => {
    const older = { ...DEFAULT_DRAFT, id: 'person', name: 'Meera' } as Record<string, unknown>;
    delete older.autoSuggestions;
    delete older.autoPhrases;
    delete older.agentEnabled;
    rows.settings.set('setup', older);
    await loadSettings();
    expect(currentSetup()).toMatchObject({
      autoSuggestions: true,
      autoPhrases: true,
      agentEnabled: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeSetup(listener);
    await Promise.all([
      updateSetup({ autoSuggestions: false }),
      updateSetup({ agentEnabled: false }),
    ]);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(rows.settings.get('setup')).toMatchObject({
      autoSuggestions: false,
      agentEnabled: false,
    });

    await loadSettings();
    expect(currentSetup()).toMatchObject({ autoSuggestions: false, agentEnabled: false });
  });

  it('reports a failed write, keeps the saved answer, and accepts the next write', async () => {
    await loadSettings();
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });
    vi.mocked(platform.store.putSetting).mockRejectedValueOnce(new Error('Storage unavailable'));

    await expect(updateSetup({ autoSuggestions: false })).rejects.toThrow('Storage unavailable');
    expect(currentSetup()).toMatchObject({ autoSuggestions: true });

    await updateSetup({ autoPhrases: false });
    expect(currentSetup()).toMatchObject({ autoSuggestions: true, autoPhrases: false });
  });
});

describe('the owner of the rows', () => {
  it('is the login of the system, frozen into the setup', async () => {
    vi.mocked(platform.device.identity).mockResolvedValue({ name: 'Meera Rao', userId: 'meera' });
    await loadSettings();
    expect(systemName()).toBe('Meera Rao');
    expect(currentUserId()).toBe('meera');

    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });
    expect(currentSetup()?.id).toBe('meera');

    // A renamed account keeps the spaces of the old owner.
    vi.mocked(platform.device.identity).mockResolvedValue({ name: 'Meera', userId: 'meera-r' });
    await loadSettings();
    expect(currentUserId()).toBe('meera');
  });

  it('is the local user when the system knows no login', async () => {
    await loadSettings();
    expect(currentUserId()).toBe(LOCAL_USER);
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });
    expect(currentSetup()?.id).toBe(LOCAL_USER);
  });
});

describe('the device settings', () => {
  it('keep the voices heard lately', async () => {
    await heardVoices.set(['v2', 'v1']);
    await loadSettings();
    expect(heardVoices.get()).toEqual(['v2', 'v1']);
  });

  it('keep unsent words for each space apart', async () => {
    await saveTalkDraft('one', 'unfinished words');
    await saveTalkDraft('two', 'another thought');
    expect(await readTalkDraft('one')).toBe('unfinished words');
    await saveTalkDraft('one', '');
    expect(await readTalkDraft('one')).toBe('');
    expect(await readTalkDraft('two')).toBe('another thought');
    expect(await readTalkDraft('three')).toBe('');
  });

  it('keep the mood of each space, and read an unknown mood as none', async () => {
    await saveTalkMood('one', 'playful');
    expect(await readTalkMood('one')).toBe('playful');
    rows.settings.set('talk-mood:two', 'grumpy-ish');
    expect(await readTalkMood('two')).toBeNull();
  });
});
