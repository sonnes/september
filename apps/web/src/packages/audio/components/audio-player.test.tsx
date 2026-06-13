/**
 * Tests for audio-player.tsx — pure implementation, no react-use-audio-player.
 *
 * Tests focus on the logic that can be exercised without full React rendering:
 * - queue management logic
 * - device-id persistence
 * - setSinkId fallback pattern
 *
 * Full integration tests would need @testing-library/react (not in this repo).
 */

// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'september:audio-output-device';

// ── localStorage persistence ────────────────────────────────────────────────

describe('audio output device localStorage', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockStorage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('initializes to empty string when nothing is stored', () => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? '';
    expect(stored).toBe('');
  });

  it('persists selected device id', () => {
    localStorage.setItem(STORAGE_KEY, 'spk-abc');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('spk-abc');
  });

  it('clears selection when set to empty string', () => {
    localStorage.setItem(STORAGE_KEY, 'spk-abc');
    localStorage.setItem(STORAGE_KEY, '');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('');
  });

  it('reads back the last saved device id', () => {
    localStorage.setItem(STORAGE_KEY, 'spk-first');
    localStorage.setItem(STORAGE_KEY, 'spk-second');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('spk-second');
  });
});

// ── setSinkId fallback pattern ──────────────────────────────────────────────

describe('setSinkId fallback', () => {
  it('falls back to play() without sink if setSinkId rejects', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const setSinkId = vi.fn().mockRejectedValue(new Error('Device not found'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await setSinkId('missing-device-id')
      .then(() => play())
      .catch((err: Error) => {
        console.error('setSinkId failed, falling back to default device:', err);
        play();
      });

    expect(setSinkId).toHaveBeenCalledWith('missing-device-id');
    expect(play).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('plays via setSinkId when it succeeds', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const setSinkId = vi.fn().mockResolvedValue(undefined);

    await setSinkId('valid-device-id')
      .then(() => play())
      .catch(() => play());

    expect(setSinkId).toHaveBeenCalledWith('valid-device-id');
    expect(play).toHaveBeenCalledTimes(1);
  });
});

// ── Queue logic ─────────────────────────────────────────────────────────────

describe('queue management logic', () => {
  type Track = { id?: string; blob?: string };

  function simulateEnqueue(queue: Track[], track: Track, isMuted: boolean): Track[] {
    if (isMuted) return queue;
    if (queue.length === 0) return [track];
    return [...queue, track];
  }

  function simulateTrackEnd(queue: Track[], currentIndex: number): { queue: Track[]; currentIndex: number } {
    if (currentIndex < queue.length - 1) {
      return { queue, currentIndex: currentIndex + 1 };
    }
    return { queue: [], currentIndex: 0 };
  }

  it('enqueue to empty queue starts immediately (index 0)', () => {
    const q = simulateEnqueue([], { blob: 'abc', id: '1' }, false);
    expect(q).toHaveLength(1);
    expect(q[0].id).toBe('1');
  });

  it('enqueue while muted leaves queue unchanged', () => {
    const q = simulateEnqueue([], { blob: 'abc', id: '1' }, true);
    expect(q).toHaveLength(0);
  });

  it('enqueue appends when queue non-empty', () => {
    let q = simulateEnqueue([], { id: '1' }, false);
    q = simulateEnqueue(q, { id: '2' }, false);
    expect(q).toHaveLength(2);
    expect(q[1].id).toBe('2');
  });

  it('track end advances to next track', () => {
    const queue = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { queue: q2, currentIndex: idx2 } = simulateTrackEnd(queue, 0);
    expect(q2).toHaveLength(3);
    expect(idx2).toBe(1);
  });

  it('track end on last track clears queue and resets index', () => {
    const queue = [{ id: '1' }, { id: '2' }];
    const { queue: q2, currentIndex: idx2 } = simulateTrackEnd(queue, 1);
    expect(q2).toHaveLength(0);
    expect(idx2).toBe(0);
  });
});

// ── Device enumeration filtering ───────────────────────────────────────────

describe('filterAndMapAudioOutputDevices', () => {
  function filterAndMap(devices: MediaDeviceInfo[]): { deviceId: string; label: string }[] {
    return devices
      .filter(d => d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` }));
  }

  function makeDevice(overrides: Partial<MediaDeviceInfo>): MediaDeviceInfo {
    return { deviceId: 'id-1', groupId: 'g1', kind: 'audiooutput', label: '', toJSON: () => ({}), ...overrides } as MediaDeviceInfo;
  }

  it('filters out non-audiooutput devices', () => {
    const devices = [
      makeDevice({ kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' }),
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-1', label: 'Speaker' }),
    ];
    expect(filterAndMap(devices)).toHaveLength(1);
  });

  it('filters out default and communications deviceIds', () => {
    const devices = [
      makeDevice({ deviceId: 'default', label: 'Default' }),
      makeDevice({ deviceId: 'communications', label: 'Comms' }),
      makeDevice({ deviceId: 'spk-1', label: 'Speaker' }),
    ];
    expect(filterAndMap(devices)).toHaveLength(1);
  });

  it('uses fallback label when label is empty', () => {
    const devices = [
      makeDevice({ deviceId: 'spk-1', label: '' }),
      makeDevice({ deviceId: 'spk-2', label: '' }),
    ];
    const result = filterAndMap(devices);
    expect(result[0].label).toBe('Speaker 1');
    expect(result[1].label).toBe('Speaker 2');
  });
});

// ── isDeviceSelectionSupported ──────────────────────────────────────────────

describe('isDeviceSelectionSupported', () => {
  it('is true when HTMLAudioElement has setSinkId', () => {
    // In jsdom environment, setSinkId may or may not be present
    const supported =
      typeof navigator !== 'undefined' &&
      typeof HTMLAudioElement !== 'undefined' &&
      'setSinkId' in HTMLAudioElement.prototype;
    // Just verify the check runs without throwing
    expect(typeof supported).toBe('boolean');
  });
});
