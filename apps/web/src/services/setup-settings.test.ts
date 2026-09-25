import 'fake-indexeddb/auto';
import { beforeEach, expect, it, vi } from 'vitest';

import { DEFAULT_DRAFT } from '../rules/onboarding';

beforeEach(() => vi.resetModules());

it('loads legacy defaults and persists independent changes across reloads', async () => {
  const { getRepository } = await import('./repository');
  const repository = await getRepository();
  const legacy = { ...DEFAULT_DRAFT, id: 'person' } as Record<string, unknown>;
  delete legacy.autoSuggestions;
  delete legacy.autoPhrases;
  await repository.putSetting('setup', legacy);
  const os = await import('./os');
  await os.bootstrapBrowserServices();
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true, autoPhrases: true });
  await Promise.all([
    os.updateSetup({ autoSuggestions: false }),
    os.updateSetup({ autoPhrases: false }),
  ]);
  expect(await repository.getSetting('setup')).toMatchObject({
    autoSuggestions: false,
    autoPhrases: false,
  });
  vi.resetModules();
  const reloaded = await import('./os');
  await reloaded.bootstrapBrowserServices();
  expect(reloaded.currentSetup()).toMatchObject({ autoSuggestions: false, autoPhrases: false });
});

it('reports write failures without changing saved settings and recovers on retry', async () => {
  const { getRepository } = await import('./repository');
  const repository = await getRepository();
  const os = await import('./os');
  await os.saveSetup(DEFAULT_DRAFT);
  const write = vi
    .spyOn(repository, 'putSetting')
    .mockRejectedValueOnce(new Error('Storage unavailable'));
  await expect(os.updateSetup({ autoSuggestions: false })).rejects.toThrow('Storage unavailable');
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true });
  await os.updateSetup({ autoPhrases: false });
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true, autoPhrases: false });
  write.mockRestore();
});

it('turns the agent on for a setup saved before the agent switch, and keeps it off once saved', async () => {
  const { getRepository } = await import('./repository');
  const repository = await getRepository();
  const legacy = { ...DEFAULT_DRAFT, id: 'person' } as Record<string, unknown>;
  delete legacy.agentEnabled;
  await repository.putSetting('setup', legacy);
  const os = await import('./os');
  await os.bootstrapBrowserServices();
  expect(os.currentSetup()).toMatchObject({ agentEnabled: true });
  await os.updateSetup({ agentEnabled: false });
  vi.resetModules();
  const reloaded = await import('./os');
  await reloaded.bootstrapBrowserServices();
  expect(reloaded.currentSetup()).toMatchObject({ agentEnabled: false });
});

it('keeps the voices heard lately across reloads', async () => {
  const os = await import('./os');
  await os.bootstrapBrowserServices();
  await os.rememberHeardVoices(['v2', 'v1']);
  expect(os.heardVoiceIds).toEqual(['v2', 'v1']);
  vi.resetModules();
  const reloaded = await import('./os');
  await reloaded.bootstrapBrowserServices();
  expect(reloaded.heardVoiceIds).toEqual(['v2', 'v1']);
});

it('passes the category and owner of each ElevenLabs voice to the screen', async () => {
  const { getRepository } = await import('./repository');
  await (await getRepository()).putSetting('provider-keys', { elevenlabs: 'xi-test' });
  const os = await import('./os');
  await os.bootstrapBrowserServices();
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ voices: [{ voice_id: 'v1', name: 'Mine', category: 'cloned', is_owner: true }] }))
  );
  try {
    const voices = await os.listVoices();
    expect(voices[0]).toMatchObject({ id: 'v1', category: 'cloned', is_owner: true });
  } finally {
    fetch.mockRestore();
  }
});
