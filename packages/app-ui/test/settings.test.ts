import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  currentSetup,
  currentUserId,
  dismissedIdeas,
  heardVoices,
  loadSettings,
  saveSetup,
  spaceModes,
  subscribeSetup,
  systemName,
  updateSetup,
} from '@september/app-ui/services/settings';
import { useTalkMood } from '@september/app-ui/services/talk';
import { DEFAULT_DRAFT } from '@september/core/rules/onboarding';
import { LOCAL_USER, SETTINGS, talkMoodKey } from '@september/core/rules/settings';

import { platform, rows } from './platform';
import { addSpace, findButton, finishSetup, press, renderApp, renderPart } from './render';

describe('the setup', () => {
  it('reads an older setup with its new switches on, and keeps each change', async () => {
    const older = { ...DEFAULT_DRAFT, id: 'person', name: 'Meera' } as Record<string, unknown>;
    delete older.autoSuggestions;
    delete older.autoPhrases;
    delete older.agentEnabled;
    rows.settings.set(SETTINGS.setup, older);
    await loadSettings();
    expect(currentSetup()).toMatchObject({
      autoSuggestions: true,
      autoPhrases: true,
      agentEnabled: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeSetup(listener);
    await Promise.all([updateSetup({ autoSuggestions: false }), updateSetup({ agentEnabled: false })]);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(rows.settings.get(SETTINGS.setup)).toMatchObject({
      autoSuggestions: false,
      agentEnabled: false,
    });

    await loadSettings();
    expect(currentSetup()).toMatchObject({ autoSuggestions: false, agentEnabled: false });
  });

  it('reports a failed write, keeps the saved answer, and accepts the next write', async () => {
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

    vi.mocked(platform.device.identity).mockResolvedValue({ name: 'Meera', userId: 'meera-r' });
    await loadSettings();
    expect(currentUserId()).toBe('meera');
  });

  it('is the local user when the system knows no login', async () => {
    expect(currentUserId()).toBe(LOCAL_USER);
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });
    expect(currentSetup()?.id).toBe(LOCAL_USER);
  });
});

/** A store that cannot read the setting `key`, and reads every other one. */
function failToRead(key: string): void {
  vi.mocked(platform.store.getSetting).mockImplementation(async <T>(read: string) => {
    if (read === key) throw new Error('Storage unavailable');
    return (rows.settings.get(read) as T | undefined) ?? null;
  });
}

describe('a setting that cannot be read', () => {
  it('takes its default and lets the app start with the other settings', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await saveSetup({ ...DEFAULT_DRAFT, name: 'Meera' });
    rows.settings.set(SETTINGS.heardVoices, ['v1']);
    failToRead(SETTINGS.heardVoices);

    await loadSettings();

    expect(heardVoices.get()).toEqual([]);
    expect(currentSetup()).toMatchObject({ name: 'Meera' });
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('stops the start when it is the saved setup, so a finished user never sees setup again', async () => {
    failToRead(SETTINGS.setup);

    await expect(loadSettings()).rejects.toThrow('Storage unavailable');
  });

  it('does not write a voice over the saved voice it could not read', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const chosen = { provider: 'elevenlabs', voiceId: 'voice-1' };
    rows.settings.set(SETTINGS.setup, { ...DEFAULT_DRAFT, id: 'person', voiceService: 'elevenlabs' });
    rows.settings.set(SETTINGS.speech, chosen);
    failToRead(SETTINGS.speech);

    await loadSettings();

    expect(rows.settings.get(SETTINGS.speech)).toEqual(chosen);
    logged.mockRestore();
  });
});

describe('the device settings', () => {
  it('show a kept value before its write ends, and keep it when the write fails', async () => {
    let fail!: (reason: Error) => void;
    vi.mocked(platform.store.putSetting).mockImplementationOnce(
      () => new Promise<void>((_, reject) => (fail = reject)),
    );
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    dismissedIdeas.keep(['call mum']);
    expect(dismissedIdeas.get()).toEqual(['call mum']);

    fail(new Error('Storage unavailable'));
    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    expect(dismissedIdeas.get()).toEqual(['call mum']);
    logged.mockRestore();
  });

  it('keep the voices heard lately', async () => {
    await heardVoices.set(['v2', 'v1']);
    await loadSettings();
    expect(heardVoices.get()).toEqual(['v2', 'v1']);
  });

  it('keep the mood of each space, and read an unknown mood as none', async () => {
    rows.settings.set(talkMoodKey('two'), 'grumpy-ish');
    const seen: Record<string, ReturnType<typeof useTalkMood>> = {};
    const Probe = ({ id }: { id: string }) => {
      seen[id] = useTalkMood(id);
      return null;
    };
    await renderPart([createElement(Probe, { key: 'one', id: 'one' }), createElement(Probe, { key: 'two', id: 'two' })]);
    await vi.waitFor(() => expect(platform.store.getSetting).toHaveBeenCalledWith(talkMoodKey('two')));

    seen.one!.choose('playful');
    await vi.waitFor(() => expect(rows.settings.get(talkMoodKey('one'))).toBe('playful'));
    expect(seen.two!.mood).toBeNull();
    expect(rows.settings.get(talkMoodKey('two'))).toBe('grumpy-ish');
  });
});

describe('the remembered mode of a space', () => {
  it('moves a mode kept by slug to the id of the space', async () => {
    await finishSetup();
    const space = addSpace('Family Room', { id: 'space-1' });
    rows.settings.set(SETTINGS.spaceModes, { 'family-room': 'notes' });

    await loadSettings();

    expect(spaceModes.get()).toEqual({ [space.id]: 'notes' });
    expect(rows.settings.get(SETTINGS.spaceModes)).toEqual({ [space.id]: 'notes' });
  });

  it('opens a space from the Spaces list in the mode kept by slug', async () => {
    await finishSetup();
    addSpace('Family Room', { id: 'space-1' });
    rows.settings.set(SETTINGS.spaceModes, { 'family-room': 'notes' });
    await loadSettings();

    const { router } = await renderApp('/spaces');
    await press(await findButton('Family Room'));

    await vi.waitFor(() => expect(router!.state.location.pathname).toBe('/spaces/family-room/notes'));
  });
});
