import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readAudioOutputDevice, writeAudioOutputDevice } from './audio-output-setting';

const { getDesktopSetting, putDesktopSetting } = vi.hoisted(() => ({
  getDesktopSetting: vi.fn(),
  putDesktopSetting: vi.fn(),
}));

vi.mock('@/packages/shared/lib/data', () => ({
  getDesktopSetting,
  isDesktopRuntime: () => true,
  putDesktopSetting,
}));

describe('desktop audio output setting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads and writes the preference through Rust settings RPC', async () => {
    getDesktopSetting.mockResolvedValue('speaker-1');
    putDesktopSetting.mockResolvedValue('speaker-2');

    await expect(readAudioOutputDevice()).resolves.toBe('speaker-1');
    await writeAudioOutputDevice('speaker-2');

    expect(getDesktopSetting).toHaveBeenCalledWith('audio-output-device');
    expect(putDesktopSetting).toHaveBeenCalledWith('audio-output-device', 'speaker-2');
  });
});
