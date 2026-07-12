import { describe, expect, it } from 'vitest';

import { pickKokoroBackend } from './kokoro-backend';

describe('pickKokoroBackend', () => {
  it('uses WebGPU with fp32 when an adapter is available', () => {
    expect(pickKokoroBackend(true)).toEqual({ device: 'webgpu', dtype: 'fp32' });
  });

  it('falls back to WASM with q8 when WebGPU is unavailable', () => {
    expect(pickKokoroBackend(false)).toEqual({ device: 'wasm', dtype: 'q8' });
  });
});
