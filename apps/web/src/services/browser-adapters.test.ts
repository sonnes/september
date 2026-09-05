import { describe, expect, it } from 'vitest';

import { isVirtualDeviceAvailable, virtualMicrophoneStatus } from './os';

describe('browser-only desktop adapters', () => {
  it('marks the virtual microphone unavailable', async () => {
    const microphone = await virtualMicrophoneStatus();

    expect(isVirtualDeviceAvailable(microphone)).toBe(false);
  });
});
