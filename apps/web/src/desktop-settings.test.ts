import { beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_DRAFT } from '../../desktop/src/rules/onboarding';

const state = vi.hoisted(() => ({ values: new Map<string, unknown>(), fail: false }));
vi.mock('../../desktop/node_modules/@tauri-apps/api/core.js', () => ({
  isTauri: () => false,
  convertFileSrc: (value: string) => value,
  invoke: async (command: string, args?: { request?: { key: string; value?: unknown } }) => {
    if (command === 'user_name' || command === 'user_id') return 'person';
    if (command === 'setting_get') return state.values.get(args!.request!.key) ?? null;
    if (command === 'setting_put') {
      if (state.fail) throw new Error('Storage unavailable');
      state.values.set(args!.request!.key, args!.request!.value);
    }
  },
}));

beforeEach(() => { vi.resetModules(); state.values.clear(); state.fail = false; });

it('loads legacy defaults and persists independent desktop settings across reloads', async () => {
  const legacy = { ...DEFAULT_DRAFT, id: 'person' } as Record<string, unknown>;
  delete legacy.autoSuggestions;
  delete legacy.autoPhrases;
  state.values.set('setup', legacy);
  const os = await import('../../desktop/src/services/os');
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true, autoPhrases: true });
  const listener = vi.fn();
  const unsubscribe = os.subscribeSetup(listener);
  await Promise.all([os.updateSetup({ autoSuggestions: false }), os.updateSetup({ autoPhrases: false })]);
  expect(state.values.get('setup')).toMatchObject({ autoSuggestions: false, autoPhrases: false });
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  vi.resetModules();
  const reloaded = await import('../../desktop/src/services/os');
  expect(reloaded.currentSetup()).toMatchObject({ autoSuggestions: false, autoPhrases: false });
});

it('reports a failed native write without changing the saved switch and permits retry', async () => {
  state.values.set('setup', { ...DEFAULT_DRAFT, id: 'person' });
  const os = await import('../../desktop/src/services/os');
  state.fail = true;
  await expect(os.updateSetup({ autoSuggestions: false })).rejects.toThrow('Storage unavailable');
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true });
  state.fail = false;
  await os.updateSetup({ autoPhrases: false });
  expect(os.currentSetup()).toMatchObject({ autoSuggestions: true, autoPhrases: false });
});
