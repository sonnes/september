import { describe, expect, it } from 'vitest';

import { int16ToFloat32 } from './pcm-stream-player';

describe('int16ToFloat32', () => {
  it('maps full-scale Int16 values to [-1, 1)', () => {
    const out = int16ToFloat32(new Int16Array([0, 32767, -32768]));
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[1]).toBeCloseTo(32767 / 32768, 6);
    expect(out[2]).toBe(-1);
  });

  it('preserves length', () => {
    expect(int16ToFloat32(new Int16Array(5)).length).toBe(5);
  });
});
