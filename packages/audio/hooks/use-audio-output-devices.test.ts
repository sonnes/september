import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Pure helpers extracted from audio-player logic for isolated testing.
// These mirror the exact patterns used inside AudioPlayerQueueProvider.

const STORAGE_KEY = 'september:audio-output-device';

function filterAndMapAudioOutputDevices(devices: MediaDeviceInfo[]): { deviceId: string; label: string }[] {
  return devices
    .filter(d => d.kind === 'audiooutput' && d.deviceId)
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` }));
}

function makeDevice(overrides: Partial<MediaDeviceInfo>): MediaDeviceInfo {
  return {
    deviceId: 'id-1',
    groupId: 'group-1',
    kind: 'audiooutput',
    label: '',
    toJSON: () => ({}),
    ...overrides,
  } as MediaDeviceInfo;
}

// ────────────────────────────────────────────────────────
// Device enumeration filtering
// ────────────────────────────────────────────────────────

describe('filterAndMapAudioOutputDevices', () => {
  it('filters out non-audiooutput devices', () => {
    const devices = [
      makeDevice({ kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' }),
      makeDevice({ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera' }),
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-1', label: 'Speaker' }),
    ];
    const result = filterAndMapAudioOutputDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].deviceId).toBe('spk-1');
  });

  it('filters out devices with empty deviceId', () => {
    const devices = [
      makeDevice({ kind: 'audiooutput', deviceId: '', label: 'Default' }),
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-1', label: 'Speaker' }),
    ];
    const result = filterAndMapAudioOutputDevices(devices);
    expect(result).toHaveLength(1);
    expect(result[0].deviceId).toBe('spk-1');
  });

  it('uses device label when available', () => {
    const devices = [
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-1', label: 'Bluetooth Headset' }),
    ];
    const result = filterAndMapAudioOutputDevices(devices);
    expect(result[0].label).toBe('Bluetooth Headset');
  });

  it('uses positional fallback label when label is empty (no mic permission)', () => {
    const devices = [
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-1', label: '' }),
      makeDevice({ kind: 'audiooutput', deviceId: 'spk-2', label: '' }),
    ];
    const result = filterAndMapAudioOutputDevices(devices);
    expect(result[0].label).toBe('Speaker 1');
    expect(result[1].label).toBe('Speaker 2');
  });

  it('returns empty array when no audiooutput devices', () => {
    const devices = [
      makeDevice({ kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' }),
    ];
    expect(filterAndMapAudioOutputDevices(devices)).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────
// localStorage persistence
// ────────────────────────────────────────────────────────

describe('audio output device localStorage', () => {
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
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

// ────────────────────────────────────────────────────────
// setSinkId fallback behavior
// ────────────────────────────────────────────────────────

describe('setSinkId fallback', () => {
  it('falls back to play() without sink if setSinkId rejects', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const setSinkId = vi.fn().mockRejectedValue(new Error('Device not found'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate the setSinkId + fallback pattern from audio-player.tsx
    await setSinkId('missing-device-id')
      .then(() => play())
      .catch(err => {
        console.error('setSinkId failed, falling back to default device:', err);
        play();
      });

    expect(setSinkId).toHaveBeenCalledWith('missing-device-id');
    expect(play).toHaveBeenCalledTimes(1); // fallback play, not the .then() play
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

// ────────────────────────────────────────────────────────
// __default__ sentinel (SpeechSettingsForm ↔ useAudioPlayer bridge)
// ────────────────────────────────────────────────────────

describe('__default__ sentinel conversion', () => {
  // Mirrors the onValueChange logic in SpeechSettingsForm
  const convert = (id: string) => (id === '__default__' ? '' : id);
  const display = (id: string) => id || '__default__';

  it('converts __default__ to empty string for storage', () => {
    expect(convert('__default__')).toBe('');
  });

  it('converts real device id unchanged', () => {
    expect(convert('spk-abc')).toBe('spk-abc');
  });

  it('displays empty string as __default__ in the Select', () => {
    expect(display('')).toBe('__default__');
  });

  it('displays real device id unchanged', () => {
    expect(display('spk-abc')).toBe('spk-abc');
  });
});
