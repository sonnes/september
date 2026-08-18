import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore } from './auth';

const { deleteDesktopSetting, getDesktopSetting, putDesktopSetting } = vi.hoisted(() => ({
  deleteDesktopSetting: vi.fn(),
  getDesktopSetting: vi.fn(),
  putDesktopSetting: vi.fn(),
}));

vi.mock('@/packages/shared/lib/data', () => ({
  deleteDesktopSetting,
  getDesktopSetting,
  isDesktopRuntime: () => true,
  putDesktopSetting,
}));

function makeToken(userId: string): string {
  const payload = btoa(JSON.stringify({ sub: userId, jti: 'j', exp: 9_999_999_999 }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payload}.fake-signature`;
}

describe('desktop auth storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteDesktopSetting.mockResolvedValue(true);
    putDesktopSetting.mockImplementation(async (_key, value) => value);
  });

  it('hydrates, writes, and clears the session through Rust settings RPC', async () => {
    const initial = { token: makeToken('u1'), userId: 'u1' };
    getDesktopSetting.mockResolvedValue(initial);
    const store = createAuthStore();

    expect(store.getToken()).toBeNull();
    await store.hydrate();
    expect(store.getUserId()).toBe('u1');

    const next = { token: makeToken('u2'), userId: 'u2' };
    await store.setSession(next);
    expect(putDesktopSetting).toHaveBeenCalledWith('sync-session', next);
    expect(store.getUserId()).toBe('u2');

    await store.clear();
    expect(deleteDesktopSetting).toHaveBeenCalledWith('sync-session');
    expect(store.getToken()).toBeNull();
  });
});
