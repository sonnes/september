import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PcmStreamPlayer, int16ToFloat32 } from './pcm-stream-player';

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

describe('PcmStreamPlayer output device routing', () => {
  let setSinkId: ReturnType<typeof vi.fn>;

  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    setSinkId = setSinkId;
    createBuffer() {
      return { copyToChannel: () => {}, duration: 0 };
    }
    createBufferSource() {
      return { connect: () => {}, start: () => {}, onended: null };
    }
    close() {
      return Promise.resolve();
    }
  }

  beforeEach(() => {
    setSinkId = vi.fn().mockResolvedValue(undefined);
    FakeAudioContext.prototype.setSinkId = setSinkId;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes the context to the configured sink id', () => {
    new PcmStreamPlayer(22050, 'device-123');
    expect(setSinkId).toHaveBeenCalledWith('device-123');
  });

  it('stays on the default device when no sink id is given', () => {
    new PcmStreamPlayer(22050);
    expect(setSinkId).not.toHaveBeenCalled();
  });
});
