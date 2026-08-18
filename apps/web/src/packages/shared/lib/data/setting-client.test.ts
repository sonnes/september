import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteDesktopSetting, getDesktopSetting, putDesktopSetting } from './setting-client';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('desktop setting RPC client', () => {
  beforeEach(() => invoke.mockReset());

  it('gets, writes, and deletes JSON values by key', async () => {
    invoke
      .mockResolvedValueOnce({ rate: 1.2 })
      .mockResolvedValueOnce({ rate: 1.4 })
      .mockResolvedValueOnce(true);

    await expect(getDesktopSetting('speech')).resolves.toEqual({ rate: 1.2 });
    await expect(putDesktopSetting('speech', { rate: 1.4 })).resolves.toEqual({
      rate: 1.4,
    });
    await expect(deleteDesktopSetting('speech')).resolves.toBe(true);

    expect(invoke.mock.calls).toEqual([
      ['setting_get', { request: { key: 'speech' } }],
      ['setting_put', { request: { key: 'speech', value: { rate: 1.4 } } }],
      ['setting_delete', { request: { key: 'speech' } }],
    ]);
  });
});
