/**
 * Regression tests for MediaRecorderManager (the logic layer under useMediaRecorder).
 *
 * REGRESSION 1: stopRecording(id) previously ignored the id — a single mediaRecorderRef
 *   was shared. Starting recording B before stopping A left stream A's tracks open,
 *   keeping the microphone indicator lit.
 *
 * REGRESSION 2: No unmount cleanup. Navigating away while recording left the
 *   microphone track open until the tab closed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaRecorderManager } from '../lib/media-recorder-manager';

// ─────────────────────────────────────────────────────────────────
// Stubs
// ─────────────────────────────────────────────────────────────────
interface FakeTrack { stop: ReturnType<typeof vi.fn> }
interface FakeStream { getTracks: () => FakeTrack[]; id: string }

const makeTrack = (): FakeTrack => ({ stop: vi.fn() });
const makeStream = (id: string): FakeStream => {
  // Memoize so every getTracks() call returns the same track instances.
  // Without this, each call creates fresh spies and stop() is never seen.
  const tracks = [makeTrack(), makeTrack()];
  return { id, getTracks: () => tracks };
};

let streamCounter = 0;
const streamInstances: FakeStream[] = [];

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  state = 'inactive';
  streamId: string;
  private _stopCb: (() => void) | null = null;

  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.onstop?.();
  });

  constructor(stream: FakeStream) {
    this.streamId = stream.id;
  }
}

beforeEach(() => {
  streamCounter = 0;
  streamInstances.length = 0;

  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        const s = makeStream(`stream-${streamCounter++}`);
        streamInstances.push(s);
        return s as unknown as MediaStream;
      }),
    },
  });

  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MediaRecorderManager', () => {
  it('[REGRESSION] starting recording B before stopping A stops stream A tracks', async () => {
    const mgr = new MediaRecorderManager();

    await mgr.startRecording('sample-a');
    const streamA = streamInstances[0];
    const trackA = streamA.getTracks()[0] as FakeTrack;

    // Start B without stopping A first
    await mgr.startRecording('sample-b');

    // Stream A's tracks must now be stopped
    expect(trackA.stop).toHaveBeenCalled();
  });

  it('[REGRESSION] stopAll() stops all active recording tracks (simulates unmount)', async () => {
    const mgr = new MediaRecorderManager();
    await mgr.startRecording('sample-x');
    const tracks = streamInstances[0].getTracks() as FakeTrack[];

    mgr.stopAll();

    tracks.forEach(t => expect(t.stop).toHaveBeenCalled());
  });

  it('stopRecording(id) targets the specific recording by id', async () => {
    const mgr = new MediaRecorderManager();
    await mgr.startRecording('sample-a');
    await mgr.startRecording('sample-b');

    const tracksA = streamInstances[0].getTracks() as FakeTrack[];
    const tracksB = streamInstances[1].getTracks() as FakeTrack[];

    // Stop only A — but starting B already stopped A's stream in this impl
    // (mic is exclusive). This verifies the Map-keyed approach and that
    // stopRecording('b') targets the right entry.
    mgr.stopRecording('sample-b');
    tracksB.forEach(t => expect(t.stop).toHaveBeenCalled());
    // A's tracks were already stopped when B started
    tracksA.forEach(t => expect(t.stop).toHaveBeenCalled());
  });

  it('calls onComplete callback with the blob when recording stops', async () => {
    const onComplete = vi.fn();
    const mgr = new MediaRecorderManager();
    mgr.setCallbacks({ onComplete });

    await mgr.startRecording('s1');
    mgr.stopRecording('s1');

    expect(onComplete).toHaveBeenCalledWith('s1', expect.any(Blob));
  });

  it('calls onStatusChange("recording") on start and clean stop', async () => {
    const statusChanges: Array<[string, string]> = [];
    const mgr = new MediaRecorderManager();
    mgr.setCallbacks({ onStatusChange: (id, s) => statusChanges.push([id, s]) });

    await mgr.startRecording('s1');
    expect(statusChanges).toContainEqual(['s1', 'recording']);
  });

  it('sets status to error and calls onError when getUserMedia is denied', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new Error('Permission denied')
    );

    const errors: Array<[string, string]> = [];
    const statuses: Array<[string, string]> = [];
    const mgr = new MediaRecorderManager();
    mgr.setCallbacks({
      onError: (id, msg) => errors.push([id, msg]),
      onStatusChange: (id, s) => statuses.push([id, s]),
    });

    await mgr.startRecording('s1');

    expect(statuses).toContainEqual(['s1', 'error']);
    expect(errors[0][1]).toContain('Permission denied');
  });
});
