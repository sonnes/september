import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteDesktopSetting, getDesktopSetting, putDesktopSetting } from './setting-client';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop setting RPC client', () => {
  beforeEach(() => invoke.mockReset());

  it('gets, writes, and deletes JSON values by key', async () => {
    invoke
      .mockResolvedValueOnce({ token: 'session' })
      .mockResolvedValueOnce({ token: 'next' })
      .mockResolvedValueOnce(true);

    await expect(getDesktopSetting('sync-session')).resolves.toEqual({ token: 'session' });
    await expect(putDesktopSetting('sync-session', { token: 'next' })).resolves.toEqual({
      token: 'next',
    });
    await expect(deleteDesktopSetting('sync-session')).resolves.toBe(true);

    expect(invoke.mock.calls).toEqual([
      ['setting_get', { request: { key: 'sync-session' } }],
      ['setting_put', { request: { key: 'sync-session', value: { token: 'next' } } }],
      ['setting_delete', { request: { key: 'sync-session' } }],
    ]);
  });
});
