import 'fake-indexeddb/auto';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapBrowserServices,
  chooseOutput,
  InterruptedSpeech,
  stopNativeSpeech,
  streamSpeech,
  synthesizeSpeech,
} from './os';
import { openRepository } from './repository';
import type { SpeechSettings } from './speech';

const settings: SpeechSettings = {
  provider: 'elevenlabs',
  voiceId: 'voice-1',
  modelId: 'eleven_flash_v2_5',
  stability: 0.5,
  similarity: 0.75,
  speed: 1,
};

class FakeSocket {
  static opened: FakeSocket[] = [];
  sent: unknown[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.opened.push(this);
    queueMicrotask(() => this.onopen?.());
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
  }

  reply(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  drop() {
    this.onclose?.();
  }
}

class FakeSource {
  buffer: { getChannelData(channel: number): Float32Array } | null = null;
  startAt: number | null = null;
  stopped = false;
  onended: (() => void) | null = null;
  connect() {}
  start(at: number) {
    this.startAt = at;
  }
  stop() {
    this.stopped = true;
  }
  end() {
    this.onended?.();
  }
}

class FakeContext {
  static made: FakeContext[] = [];
  currentTime = 0;
  closed = false;
  sinkId = '';
  destination = {};
  sources: FakeSource[] = [];

  constructor(public options: { sampleRate: number }) {
    FakeContext.made.push(this);
  }

  createBuffer(_channels: number, length: number, rate: number) {
    const data = new Float32Array(length);
    return { duration: length / rate, length, getChannelData: () => data };
  }

  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }

  async setSinkId(id: string) {
    this.sinkId = id;
  }

  async close() {
    this.closed = true;
  }
}

const sound = (bytes: number[]) => ({ audio: btoa(String.fromCharCode(...bytes)) });

/** The socket of the next sentence, once the cache lookup has missed. */
async function nextSocket(count: number): Promise<FakeSocket> {
  await vi.waitFor(() => expect(FakeSocket.opened).toHaveLength(count));
  const socket = FakeSocket.opened[count - 1];
  await vi.waitFor(() => expect(socket.sent).toHaveLength(3));
  return socket;
}

const lastContext = () => FakeContext.made[FakeContext.made.length - 1];

/** Speaks one complete sentence: two samples, then the end. */
async function speakWhole(text: string): Promise<void> {
  const done = streamSpeech(text, settings);
  const socket = await nextSocket(FakeSocket.opened.length + 1);
  socket.reply(sound([0, 64, 0, 192]));
  socket.reply({ isFinal: true });
  lastContext().sources.forEach(source => source.end());
  await done;
}

beforeAll(async () => {
  const repository = await openRepository({ migrate: false });
  await repository.putSetting('provider-keys', { elevenlabs: 'secret' });
  repository.close();
  await bootstrapBrowserServices();
});

beforeEach(() => {
  FakeSocket.opened = [];
  FakeContext.made = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:kept');
      static revokeObjectURL = vi.fn();
    }
  );
  vi.stubGlobal(
    'Audio',
    class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => queueMicrotask(() => this.onended?.()));
    }
  );
});

afterEach(async () => {
  await stopNativeSpeech();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('streamed cloud speech', () => {
  it('sends the sentence through the voice socket and plays each chunk after the one before', async () => {
    const done = streamSpeech('Open the door.', settings);
    const socket = await nextSocket(1);

    expect(socket.url).toBe(
      'wss://api.elevenlabs.io/v1/text-to-speech/voice-1/stream-input?model_id=eleven_flash_v2_5&output_format=pcm_24000'
    );
    expect(socket.sent).toEqual([
      {
        text: ' ',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1 },
        xi_api_key: 'secret',
      },
      { text: 'Open the door. ', flush: true },
      { text: '' },
    ]);

    socket.reply(sound([0, 64, 0, 192]));
    socket.reply(sound([0, 64]));
    socket.reply({ isFinal: true });

    const context = lastContext();
    expect(context.options.sampleRate).toBe(24_000);
    expect(context.sources.map(source => source.startAt)).toEqual([0, 2 / 24_000]);
    expect(Array.from(context.sources[0].buffer!.getChannelData(0))).toEqual([0.5, -0.5]);

    context.sources.forEach(source => source.end());
    await expect(done).resolves.toMatchObject({ from_cache: false });
    expect(socket.closed).toBe(true);
  });

  it('keeps a sample whole when a chunk ends inside it', async () => {
    const done = streamSpeech('Split sample.', settings);
    const socket = await nextSocket(1);

    socket.reply(sound([0, 64, 0]));
    socket.reply(sound([192]));
    socket.reply({ isFinal: true });

    const buffers = lastContext().sources.map(source =>
      Array.from(source.buffer!.getChannelData(0))
    );
    expect(buffers).toEqual([[0.5], [-0.5]]);
    lastContext().sources.forEach(source => source.end());
    await done;
  });

  it('plays a complete sentence again without the socket', async () => {
    await speakWhole('Keep this sentence.');

    await expect(streamSpeech('Keep this sentence.', settings)).resolves.toMatchObject({
      from_cache: true,
    });
    expect(FakeSocket.opened).toHaveLength(1);
  });

  it('plays a sentence that the file path kept', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['mp3 bytes'], { type: 'audio/mpeg' }),
    })));
    await synthesizeSpeech('An older sentence.', settings);

    await expect(streamSpeech('An older sentence.', settings)).resolves.toMatchObject({
      from_cache: true,
    });
    expect(FakeSocket.opened).toHaveLength(0);
  });

  it('keeps nothing of a sentence that was stopped', async () => {
    const request = new AbortController();
    const done = streamSpeech('Stop me.', settings, request.signal);
    const socket = await nextSocket(1);
    socket.reply(sound([0, 64]));

    request.abort();

    await expect(done).resolves.toMatchObject({ from_cache: false });
    expect(socket.closed).toBe(true);
    expect(lastContext().sources[0].stopped).toBe(true);

    void streamSpeech('Stop me.', settings);
    await nextSocket(2);
  });

  it('closes the socket when the voice is stopped', async () => {
    const done = streamSpeech('Stop from outside.', settings);
    const socket = await nextSocket(1);

    await stopNativeSpeech();

    await done;
    expect(socket.closed).toBe(true);
    expect(lastContext().closed).toBe(true);
  });

  it('fails as an ordinary error when the socket breaks before any sound', async () => {
    const done = streamSpeech('No sound yet.', settings);
    const socket = await nextSocket(1);

    socket.drop();

    const reason = await done.catch(error => error);
    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
    expect(lastContext().closed).toBe(true);
  });

  it('fails with the reason that the voice sends', async () => {
    const done = streamSpeech('Bad key.', settings);
    const socket = await nextSocket(1);

    socket.reply({ message: 'Invalid API key', error: 'invalid_api_key' });

    await expect(done).rejects.toThrow('Invalid API key');
  });

  it('fails when no sound arrives within 5 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const done = streamSpeech('Slow voice.', settings);
    const socket = await nextSocket(1);

    vi.advanceTimersByTime(5_000);

    const reason = await done.catch(error => error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
    expect(socket.closed).toBe(true);
  });

  it('fails as an interruption when the socket breaks after the sound began', async () => {
    const done = streamSpeech('Half a sentence.', settings);
    const socket = await nextSocket(1);
    socket.reply(sound([0, 64]));

    socket.drop();

    await expect(done).rejects.toBeInstanceOf(InterruptedSpeech);
    expect(lastContext().sources[0].stopped).toBe(true);
  });

  it('uses a file for a model that has no socket', async () => {
    const fetchSpeech = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['mp3 bytes'], { type: 'audio/mpeg' }),
    }));
    vi.stubGlobal('fetch', fetchSpeech);

    await expect(
      streamSpeech('Expressive words.', { ...settings, modelId: 'eleven_v3' })
    ).resolves.toMatchObject({ from_cache: false });
    expect(fetchSpeech).toHaveBeenCalledTimes(1);
    expect(FakeSocket.opened).toHaveLength(0);
  });

  it('plays the stream on the chosen output', async () => {
    await chooseOutput('speaker');
    const done = streamSpeech('Through the speaker.', settings);
    await nextSocket(1);

    expect(lastContext().sinkId).toBe('speaker');
    await stopNativeSpeech();
    await done;
  });
});
