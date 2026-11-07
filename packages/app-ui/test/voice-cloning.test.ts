import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cloneVoice,
  MediaRecorderManager,
  recordingFile,
  SamplePlayer,
} from '@september/app-ui/services/cloning';

import { platform } from './platform';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const audio = (name: string, type = 'audio/wav') => new File([new Uint8Array([1])], name, { type });

describe('a voice clone', () => {
  it('sends one form with every sample, the name, and the label', async () => {
    const upload = audio('upload.mp3', 'audio/mpeg');
    const recording = audio('prompt.m4a', 'audio/mp4');

    const created = await cloneVoice({
      files: [upload, recording],
      name: '  My voice  ',
      description: 'Calm and clear',
    });

    expect(created).toEqual({ id: 'cloned', name: 'My voice' });
    const form = vi.mocked(platform.providers.cloneVoice).mock.calls[0][0];
    expect(form.getAll('files').map(file => (file as File).name)).toEqual([
      'upload.mp3',
      'prompt.m4a',
    ]);
    expect(form.get('name')).toBe('My voice');
    expect(form.get('description')).toBe('Calm and clear');
    expect(form.get('labels')).toBe('{"app":"september"}');
  });

  it('keeps bad input away from the provider', async () => {
    await expect(cloneVoice({ files: [], name: 'Voice' })).rejects.toThrow();
    await expect(cloneVoice({ files: [audio('voice.wav')], name: '   ' })).rejects.toThrow();
    expect(platform.providers.cloneVoice).not.toHaveBeenCalled();
  });
});

describe('a recording', () => {
  it("keeps the recorder's real media type", () => {
    const file = recordingFile(
      'birch-canoe',
      new Blob([new Uint8Array([1])], { type: 'audio/mp4' })
    );
    expect(file.name).toBe('birch-canoe.m4a');
    expect(file.type).toBe('audio/mp4');
  });
});

interface FakeTrack {
  stopped: boolean;
  stop(): void;
}

const track = (): FakeTrack => ({
  stopped: false,
  stop() {
    this.stopped = true;
  },
});

class FakeMediaRecorder {
  static isTypeSupported(type: string) {
    return type === 'audio/mp4';
  }

  state = 'inactive';
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: unknown, options: { mimeType?: string } = {}) {
    this.mimeType = options.mimeType ?? 'audio/mp4';
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array([1])], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function microphone(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
}

describe('the recorder', () => {
  it('stops the old microphone for a new recording, and stopAll stops the new one', async () => {
    const tracks: FakeTrack[] = [];
    const completed: [string, Blob][] = [];
    microphone(async () => {
      const held = track();
      tracks.push(held);
      return { getTracks: () => [held] };
    });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);

    const manager = new MediaRecorderManager({
      onComplete: (id, blob) => completed.push([id, blob]),
    });
    await manager.start('first');
    await manager.start('second');
    expect(tracks[0].stopped).toBe(true);
    expect(completed[0][0]).toBe('first');
    expect(completed[0][1].type).toBe('audio/mp4');

    manager.stopAll();
    expect(tracks[1].stopped).toBe(true);
  });

  it('cancels a microphone request that is still pending when a newer one starts', async () => {
    const pending: ((stream: unknown) => void)[] = [];
    microphone(() => new Promise(resolve => pending.push(resolve)));
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    const first = track();
    const second = track();

    const manager = new MediaRecorderManager();
    const firstStart = manager.start('first');
    const secondStart = manager.start('second');
    pending[0]({ getTracks: () => [first] });
    await firstStart;
    expect(first.stopped).toBe(true);

    pending[1]({ getTracks: () => [second] });
    await secondStart;
    manager.stopAll();
    expect(second.stopped).toBe(true);
  });

  it('releases the microphone and reports the error when the recorder fails', async () => {
    const held = track();
    const statuses: [string, string][] = [];
    const errors: [string, string][] = [];
    microphone(async () => ({ getTracks: () => [held] }));
    vi.stubGlobal(
      'MediaRecorder',
      class {
        static isTypeSupported(): boolean {
          throw new Error('Recorder unavailable');
        }
      }
    );

    const manager = new MediaRecorderManager({
      onStatus: (id, status) => statuses.push([id, status]),
      onError: (id, message) => errors.push([id, message]),
    });
    await manager.start('sample');

    expect(held.stopped).toBe(true);
    expect(statuses).toEqual([['sample', 'error']]);
    expect(errors).toEqual([['sample', 'Recorder unavailable']]);
  });
});

describe('sample playback', () => {
  it('revokes its object URL when it stops', async () => {
    const revoked: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sample');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(url => void revoked.push(url));
    vi.stubGlobal(
      'Audio',
      class {
        currentTime = 0;
        onended = null;
        onerror = null;
        pause() {}
        async play() {}
      }
    );

    const player = new SamplePlayer();
    await player.play('sample', new Blob([new Uint8Array([1])], { type: 'audio/mp4' }));
    player.stop();
    expect(revoked).toEqual(['blob:sample']);
  });

  it('cannot report a stopped sample as playing after play resolves', async () => {
    let release = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:slow');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal(
      'Audio',
      class {
        currentTime = 0;
        onended = null;
        onerror = null;
        pause() {}
        play() {
          return new Promise<void>(resolve => {
            release = resolve;
          });
        }
      }
    );

    const player = new SamplePlayer();
    const playing = player.play('sample', new Blob([new Uint8Array([1])]));
    player.stop();
    release();
    expect(await playing).toBe(false);
  });
});
