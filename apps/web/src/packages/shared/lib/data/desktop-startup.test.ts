import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getDesktopOsUser,
  readDesktopLastRoute,
  sanitizeDesktopRoute,
  writeDesktopLastRoute,
} from './desktop-startup';

const { getDesktopSetting, invoke, putDesktopSetting } = vi.hoisted(() => ({
  getDesktopSetting: vi.fn(),
  invoke: vi.fn(),
  putDesktopSetting: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('./setting-client', () => ({ getDesktopSetting, putDesktopSetting }));

describe('desktop startup client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gets the OS account through Rust', async () => {
    invoke.mockResolvedValue({ id: 'ravi', name: 'Ravi Atluri' });

    await expect(getDesktopOsUser()).resolves.toEqual({ id: 'ravi', name: 'Ravi Atluri' });
    expect(invoke).toHaveBeenCalledWith('os_user_get');
  });

  it('keeps app routes and removes OAuth credentials', () => {
    expect(
      sanitizeDesktopRoute('/settings/connections/openrouter?code=secret&state=private&step=4')
    ).toBe('/settings/connections/openrouter?step=4');
    expect(sanitizeDesktopRoute('/spaces/morning/talk')).toBe('/spaces/morning/talk');
  });

  it('rejects startup, secondary-window, marketing, and external routes', () => {
    expect(sanitizeDesktopRoute('/desktop')).toBeNull();
    expect(sanitizeDesktopRoute('/display/space-1')).toBeNull();
    expect(sanitizeDesktopRoute('/present/note-1')).toBeNull();
    expect(sanitizeDesktopRoute('/')).toBeNull();
    expect(sanitizeDesktopRoute('https://example.com/settings')).toBeNull();
  });

  it('reads and writes the last safe route through Rust settings', async () => {
    getDesktopSetting.mockResolvedValue('/voice?page=2');
    putDesktopSetting.mockResolvedValue('/spaces');

    await expect(readDesktopLastRoute()).resolves.toBe('/voice?page=2');
    await writeDesktopLastRoute('/spaces?code=secret');

    expect(getDesktopSetting).toHaveBeenCalledWith('desktop-last-route');
    expect(putDesktopSetting).toHaveBeenCalledWith('desktop-last-route', '/spaces');
  });
});
