import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearProfile, hydrateProfile, readProfile, writeProfile } from './profile';

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

describe('desktop sync profile storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteDesktopSetting.mockResolvedValue(true);
    putDesktopSetting.mockImplementation(async (_key, value) => value);
  });

  it('hydrates, writes, and clears the display profile through Rust settings RPC', async () => {
    getDesktopSetting.mockResolvedValue({ email: 'person@example.com' });
    await hydrateProfile();
    expect(readProfile()).toEqual({ email: 'person@example.com' });

    await writeProfile({ name: 'Person' });
    expect(putDesktopSetting).toHaveBeenCalledWith('sync-profile', { name: 'Person' });
    expect(readProfile()).toEqual({ name: 'Person' });

    await clearProfile();
    expect(deleteDesktopSetting).toHaveBeenCalledWith('sync-profile');
    expect(readProfile()).toBeNull();
  });
});
