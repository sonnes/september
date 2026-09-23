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
