import { describe, expect, it } from 'vitest';

import {
  isVirtualDeviceAvailable,
  virtualCameraStatus,
  virtualMicrophoneStatus,
} from './os';
import { SETUP_MODES, VOICE_SERVICES } from '../rules/onboarding';

describe('browser-only desktop adapters', () => {
  it('marks both virtual calling devices unavailable', async () => {
    const microphone = await virtualMicrophoneStatus();
    const camera = await virtualCameraStatus();

    expect(isVirtualDeviceAvailable(microphone)).toBe(false);
    expect(isVirtualDeviceAvailable(camera)).toBe(false);
    expect(camera.detail).toContain('macOS app');
  });

  it('describes the free setup and system voice as browser services', () => {
    const copy = JSON.stringify([SETUP_MODES[0], VOICE_SERVICES[0]]);

    expect(copy).toContain('browser');
    expect(copy).not.toMatch(/\bMac\b|macOS|Apple Intelligence/);
  });
});
