import 'fake-indexeddb/auto';

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { InterruptedSpeech, type CloudVoice } from '@september/app-ui/platform';
import { dialogueParts } from '@september/core/rules/voice';

import { BrowserRepository, browserRepository } from './repository';
import { synthesizeTimed, voice } from './voice';

const flash: CloudVoice = {
  voiceId: 'voice-1',
  modelId: 'eleven_flash_v2_5',
  stability: 0.5,
  similarity: 0.75,
  speed: 1,
};

/** Speaks one sentence as an MP3 file. */
const speakFile = (text: string, signal = new AbortController().signal) =>
  voice.stream(text, flash, undefined, signal);

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

/** A text-to-speech endpoint that answers each request with an MP3 file. */
function mp3Service() {
  const fetchSpeech = vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob(['mp3 bytes'], { type: 'audio/mpeg' }),
  }));
  vi.stubGlobal('fetch', fetchSpeech);
  return fetchSpeech;
}

/** The socket of the next sentence, once the cache lookup has missed. */
async function nextSocket(count: number): Promise<FakeSocket> {
  await vi.waitFor(() => expect(FakeSocket.opened).toHaveLength(count));
  const socket = FakeSocket.opened[count - 1];
  await vi.waitFor(() => expect(socket.sent).toHaveLength(3));
  return socket;
}

const lastContext = () => FakeContext.made[FakeContext.made.length - 1];

beforeAll(async () => {
  await browserRepository.putSetting('provider-keys', { elevenlabs: 'secret' });
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
  await voice.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cloud speech', () => {
  it('speaks the sentence with an MP3 file from the text-to-speech endpoint', async () => {
    const fetchSpeech = mp3Service();

    await expect(speakFile('Open the door.')).resolves.toMatchObject({
      fromCache: false,
    });

    expect(fetchSpeech).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpeech.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice-1');
    expect(JSON.parse(String(init.body))).toMatchObject({
      text: 'Open the door.',
      model_id: 'eleven_flash_v2_5',
    });
    expect(FakeSocket.opened).toHaveLength(0);
  });

  it('plays a kept sentence again without a request', async () => {
    const fetchSpeech = mp3Service();
    await speakFile('Keep this sentence.');

    await expect(speakFile('Keep this sentence.')).resolves.toMatchObject({
      fromCache: true,
    });
    expect(fetchSpeech).toHaveBeenCalledTimes(1);
  });

  it('fails as an ordinary error when no file arrives within 15 seconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const done = speakFile('Slow voice.').catch(error => error);

    await vi.advanceTimersByTimeAsync(15_000);

    const reason = await done;
    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
  });

  it('fails as an ordinary error when ElevenLabs refuses the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401 }))
    );

    const reason = await speakFile('Bad key.').catch(error => error);

    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
  });
});

// The shared speech service gives Eleven v3 the nearest stability it takes.
const dialogue: CloudVoice = { ...flash, modelId: 'eleven_v3', stability: 0 };

/** Speaks one sentence in a Dialogue voice, in the parts the service sends. */
const speakDialogue = (
  text: string,
  chosen: CloudVoice = dialogue,
  signal = new AbortController().signal
) => voice.stream(text, chosen, dialogueParts(text), signal);

/** One dialogue request: the reply stream that a test writes into. */
interface DialogueCall {
  url: string;
  init: RequestInit & { headers: Record<string, string> };
  write(text: string): void;
  end(): void;
  break(): void;
}

function fakeDialogue(status = 200) {
  const calls: DialogueCall[] = [];
  const fetchDialogue = vi.fn(async (url: string, init: DialogueCall['init']) => {
    let control!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        control = controller;
      },
    });
    init.signal?.addEventListener('abort', () => {
      try {
        control.error(new DOMException('Aborted', 'AbortError'));
      } catch {
        // The stream already ended.
      }
    });
    calls.push({
      url,
      init,
      write: text => control.enqueue(new TextEncoder().encode(text)),
      end: () => control.close(),
      break: () => control.error(new Error('connection reset')),
    });
    return { ok: status >= 200 && status < 300, status, body };
  });
  vi.stubGlobal('fetch', fetchDialogue);
  return { calls, fetchDialogue };
}

const chunk = (bytes: number[]) =>
  JSON.stringify({ audio_base64: btoa(String.fromCharCode(...bytes)), alignment: null });

async function nextCall(calls: DialogueCall[], count: number): Promise<DialogueCall> {
  await vi.waitFor(() => expect(calls).toHaveLength(count));
  return calls[count - 1];
}

const endAllSources = () =>
  FakeContext.made.forEach(context => context.sources.forEach(source => source.end()));

describe('streamed dialogue speech', () => {
  it('sends the sentence to the dialogue stream with Eleven v3 and plays each chunk', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('[laughs] Open the door.');
    const call = await nextCall(calls, 1);

    expect(call.url).toBe(
      'https://api.elevenlabs.io/v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_24000'
    );
    expect(call.init.headers['xi-api-key']).toBe('secret');
    expect(JSON.parse(String(call.init.body))).toEqual({
      inputs: [{ text: '[laughs] Open the door.', voice_id: 'voice-1' }],
      model_id: 'eleven_v3',
      settings: { stability: 0 },
    });

    call.write(`${chunk([0, 64, 0, 192])}\n`);
    call.write(chunk([0, 64]));
    call.end();

    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(2));
    const context = lastContext();
    expect(context.options.sampleRate).toBe(24_000);
    expect(context.sources.map(source => source.startAt)).toEqual([0, 2 / 24_000]);
    expect(Array.from(context.sources[0].buffer!.getChannelData(0))).toEqual([0.5, -0.5]);

    context.sources.forEach(source => source.end());
    await expect(done).resolves.toMatchObject({ fromCache: false });
  });

  it('reads an object that arrives in two pieces, with or without a line break', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('Pieces.');
    const call = await nextCall(calls, 1);

    const whole = chunk([0, 64]);
    call.write(whole.slice(0, 9));
    call.write(`${whole.slice(9)}${chunk([0, 192])}`);
    call.end();

    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(2));
    const buffers = lastContext().sources.map(source =>
      Array.from(source.buffer!.getChannelData(0))
    );
    expect(buffers).toEqual([[0.5], [-0.5]]);
    endAllSources();
    await done;
  });

  it('keeps a sample whole when a chunk ends inside it', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('Split sample.');
    const call = await nextCall(calls, 1);

    call.write(chunk([0, 64, 0]));
    call.write(chunk([192]));
    call.end();

    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(2));
    const buffers = lastContext().sources.map(source =>
      Array.from(source.buffer!.getChannelData(0))
    );
    expect(buffers).toEqual([[0.5], [-0.5]]);
    endAllSources();
    await done;
  });

  it('plays a complete sentence again without a request', async () => {
    const { calls, fetchDialogue } = fakeDialogue();
    const done = speakDialogue('Keep this dialogue.');
    const call = await nextCall(calls, 1);
    call.write(chunk([0, 64]));
    call.end();
    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(1));
    endAllSources();
    await done;

    await expect(speakDialogue('Keep this dialogue.')).resolves.toMatchObject({
      fromCache: true,
    });
    expect(fetchDialogue).toHaveBeenCalledTimes(1);
  });

  it('keeps nothing of a sentence that was stopped', async () => {
    const { calls } = fakeDialogue();
    const request = new AbortController();
    const done = speakDialogue('Stop the dialogue.', dialogue, request.signal);
    const call = await nextCall(calls, 1);
    call.write(chunk([0, 64]));
    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(1));

    request.abort();

    await expect(done).resolves.toMatchObject({ fromCache: false });
    expect(call.init.signal?.aborted).toBe(true);
    expect(lastContext().sources[0].stopped).toBe(true);

    void speakDialogue('Stop the dialogue.');
    await nextCall(calls, 2);
    await voice.stop();
  });

  it('fails as an ordinary error when ElevenLabs refuses the request', async () => {
    fakeDialogue(401);

    const reason = await speakDialogue('Bad key.').catch(error => error);

    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
    expect(String(reason.message)).toContain('key');
  });

  it('fails when no sound arrives within 10 seconds', async () => {
    const { calls } = fakeDialogue();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const done = speakDialogue('Slow dialogue.');
    const call = await nextCall(calls, 1);

    vi.advanceTimersByTime(5_000);
    expect(call.init.signal?.aborted).toBe(false);
    vi.advanceTimersByTime(5_000);

    const reason = await done.catch(error => error);
    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
    expect(call.init.signal?.aborted).toBe(true);
  });

  it('fails when the stream ends without sound', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('Silent dialogue.');
    const call = await nextCall(calls, 1);

    call.end();

    const reason = await done.catch(error => error);
    expect(reason).toBeInstanceOf(Error);
    expect(reason).not.toBeInstanceOf(InterruptedSpeech);
  });

  it('fails as an interruption when the stream breaks after the sound began', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('Half a dialogue.');
    const call = await nextCall(calls, 1);
    call.write(chunk([0, 64]));
    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(1));

    call.break();

    await expect(done).rejects.toBeInstanceOf(InterruptedSpeech);
    expect(lastContext().sources[0].stopped).toBe(true);
  });

  it('fails as an interruption and keeps nothing when the stream ends inside a reply', async () => {
    const { calls, fetchDialogue } = fakeDialogue();
    const done = speakDialogue('Cut dialogue.');
    const call = await nextCall(calls, 1);
    call.write(chunk([0, 64]));
    call.write(chunk([0, 192]).slice(0, 9));
    call.end();

    await expect(done).rejects.toBeInstanceOf(InterruptedSpeech);

    void speakDialogue('Cut dialogue.');
    await nextCall(calls, 2);
    expect(fetchDialogue).toHaveBeenCalledTimes(2);
    await voice.stop();
  });

  it('does not play a kept sentence that was stopped before it played', async () => {
    const { calls } = fakeDialogue();
    const done = speakDialogue('Free this dialogue.');
    const call = await nextCall(calls, 1);
    call.write(chunk([0, 64]));
    call.end();
    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(1));
    endAllSources();
    await done;

    const played = vi.fn();
    vi.stubGlobal(
      'Audio',
      class {
        play = played;
        pause() {}
      }
    );
    const request = new AbortController();
    const again = speakDialogue('Free this dialogue.', dialogue, request.signal);
    request.abort();

    await expect(again).resolves.toMatchObject({ fromCache: true });
    expect(played).not.toHaveBeenCalled();
  });

  it('sends a long text in parts, one request after the other', async () => {
    const { calls } = fakeDialogue();
    const first = `${'word '.repeat(396)}end.`;
    const second = 'The last sentence.';
    const done = speakDialogue(`${first} ${second}`);

    const one = await nextCall(calls, 1);
    expect(JSON.parse(String(one.init.body)).inputs).toEqual([
      { text: first, voice_id: 'voice-1' },
    ]);
    one.write(chunk([0, 64]));
    one.end();

    const two = await nextCall(calls, 2);
    expect(JSON.parse(String(two.init.body)).inputs).toEqual([
      { text: second, voice_id: 'voice-1' },
    ]);
    two.write(chunk([0, 192]));
    two.end();

    await vi.waitFor(() => expect(lastContext().sources).toHaveLength(2));
    endAllSources();
    await expect(done).resolves.toMatchObject({ fromCache: false });
    expect(FakeContext.made).toHaveLength(1);
  });
});

const conversational: CloudVoice = { ...dialogue, modelId: 'eleven_v3_conversational' };

describe('streamed dialogue speech with Eleven v3 Conversational', () => {
  it('sends the sentence through the dialogue socket and plays each chunk', async () => {
    const done = speakDialogue('[laughs] Open the door.', conversational);
    const socket = await nextSocket(1);

    expect(socket.url).toBe(
      'wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=eleven_v3_conversational&output_format=pcm_24000'
    );
    expect(socket.sent).toEqual([
      { voices: ['voice-1'], voice_settings: { stability: 0 }, xi_api_key: 'secret' },
      { inputs: [{ text: '[laughs] Open the door.', voice_id: 'voice-1' }] },
      { close_socket: true },
    ]);

    socket.reply(sound([0, 64, 0, 192]));
    socket.reply({ is_final_audio_for_turn: true });
    socket.reply({ is_final: true });
    lastContext().sources.forEach(source => source.end());

    await expect(done).resolves.toMatchObject({ fromCache: false });
    expect(socket.closed).toBe(true);
  });

  it('fails with the reason that the dialogue socket sends', async () => {
    const done = speakDialogue('Bad key.', conversational);
    const socket = await nextSocket(1);

    socket.reply({ message: 'Invalid API key', error: 'authentication_required', code: 1008 });

    await expect(done).rejects.toThrow('Invalid API key');
  });

  it('keeps the sentence apart from the same sentence in Eleven v3', async () => {
    const done = speakDialogue('One sentence, two models.', conversational);
    const socket = await nextSocket(1);
    socket.reply(sound([0, 64]));
    socket.reply({ is_final: true });
    lastContext().sources.forEach(source => source.end());
    await done;

    const { calls } = fakeDialogue();
    void speakDialogue('One sentence, two models.');
    await nextCall(calls, 1);
    await voice.stop();
  });
});

describe('speech files', () => {
  it('reuses a kept file when the words and the voice match', async () => {
    const fetchSpeech = mp3Service();

    const first = await voice.synthesize('Please open the door.', flash);
    const second = await voice.synthesize('Please open the door.', flash);

    expect(first.size).toBe('mp3 bytes'.length);
    expect(second.size).toBe('mp3 bytes'.length);
    expect(fetchSpeech).toHaveBeenCalledTimes(1);

    await voice.synthesize('Please open the door.', { ...flash, speed: 1.2 });
    expect(fetchSpeech).toHaveBeenCalledTimes(2);
  });

  it('still gives the new file when the browser cannot keep it', async () => {
    vi.spyOn(BrowserRepository.prototype, 'putBlob').mockRejectedValueOnce(
      new Error('storage quota reached')
    );
    mp3Service();

    const file = await voice.synthesize('This file cannot be kept.', flash);
    expect(file.size).toBe('mp3 bytes'.length);
  });

  it('releases the address of a file after it plays', async () => {
    mp3Service();
    await speakFile('Release the address.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:kept');
  });

  it('does not start a file after Stop while the output is being chosen', async () => {
    mp3Service();
    await browserRepository.putSetting('audio-output', 'speaker');
    let ready!: () => void;
    const selected = new Promise<void>(resolve => {
      ready = resolve;
    });
    const play = vi.fn(async () => undefined);
    let sinkAsked!: () => void;
    const asked = new Promise<void>(resolve => {
      sinkAsked = resolve;
    });
    vi.stubGlobal(
      'Audio',
      class {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        setSinkId = () => (sinkAsked(), selected);
        pause = vi.fn();
        play = async () => {
          await play();
          this.onended?.();
        };
      }
    );

    const pending = speakFile('Stop before the output.');
    await asked;
    await voice.stop();
    ready();
    await pending;
    expect(play).not.toHaveBeenCalled();
    await browserRepository.putSetting('audio-output', '');
  });

  it('settles a stopped file that never reports its end', async () => {
    mp3Service();
    let started!: () => void;
    const playing = new Promise<void>(resolve => {
      started = resolve;
    });
    vi.stubGlobal(
      'Audio',
      class {
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        pause = vi.fn();
        play = async () => started();
      }
    );

    const pending = speakFile('Never ends.');
    await playing;
    await voice.stop();
    await expect(pending).resolves.toMatchObject({ fromCache: false });
  });

  it('makes a timed file in the voice it is given', async () => {
    const fetchSpeech = vi.fn(async (_url: string, _init: RequestInit) => ({
      ok: true,
      json: async () => ({
        audio_base64: btoa('mp3'),
        alignment: {
          characters: ['H'],
          character_start_times_seconds: [0],
          character_end_times_seconds: [0.1],
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchSpeech);

    const timed = await synthesizeTimed('[laughs] Hello there.', dialogue);

    const [url, init] = fetchSpeech.mock.calls[0];
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice-1/with-timestamps');
    expect(JSON.parse(String(init.body))).toMatchObject({
      text: '[laughs] Hello there.',
      model_id: 'eleven_v3',
    });
    expect(timed.alignment).toEqual({ characters: ['H'], start_times: [0], end_times: [0.1] });
    expect(timed.blob.size).toBe(3);
  });
});
