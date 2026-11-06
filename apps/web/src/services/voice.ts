/**
 * The voices of the browser: the system voice of the browser, an ElevenLabs
 * file, and the Dialogue voice that plays while its sound arrives.
 *
 * The blob store keeps every cloud sentence, so a sentence said again plays
 * without a request.
 */

import {
  InterruptedSpeech,
  type CloudVoice,
  type PlatformVoice,
} from '@september/app-ui/platform';
import type { SpeechAlignment } from '@september/core/rules/present/captions';
import { SETTINGS } from '@september/core/rules/settings';
import { CONVERSATIONAL_MODEL } from '@september/core/rules/voice';

import { providerKey } from './providers';
import { getRepository } from './repository';

/** The dialogue voice sends 16-bit mono samples at this rate. */
const STREAM_RATE = 24_000;
/** An ElevenLabs file that does not arrive in this time does not answer. */
const FILE_AUDIO_MS = 15_000;
/** Eleven v3 starts to speak later than Flash, so it gets more time. */
const DIALOGUE_FIRST_AUDIO_MS = 10_000;

/** The output the user chose, or the default output. */
async function audioOutput(): Promise<string> {
  try {
    return (await (await getRepository()).getSetting<string>(SETTINGS.audioOutput)) ?? '';
  } catch {
    return '';
  }
}

/** A cache key: the prefix and the SHA-256 hash of the fields. */
async function blobId(prefix: string, fields: object): Promise<string> {
  const input = new TextEncoder().encode(JSON.stringify(fields));
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}:${hash}`;
}

const speechBlobId = (text: string, voice: CloudVoice) =>
  blobId('speech', {
    text,
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    stability: voice.stability,
    similarity: voice.similarity,
    speed: voice.speed,
  });

/** A kept file, or nothing when the store holds none or cannot be read. */
async function keptBlob(id: string): Promise<Blob | null> {
  try {
    return await (await getRepository()).getBlob(id);
  } catch {
    // Speech stays available when private storage is denied or full.
    return null;
  }
}

/** Keeps a file. A failed write costs only a second request later. */
async function keepBlob(id: string, blob: Blob): Promise<void> {
  try {
    await (await getRepository()).putBlob(id, blob);
  } catch {
    // The sound still plays when the cache write fails.
  }
}

async function elevenLabsSpeech(
  text: string,
  voice: CloudVoice,
  timed: boolean
): Promise<Response> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}${
      timed ? '/with-timestamps' : ''
    }`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': await providerKey('elevenlabs'),
      },
      body: JSON.stringify({
        text,
        model_id: voice.modelId,
        voice_settings: {
          stability: voice.stability,
          similarity_boost: voice.similarity,
          speed: voice.speed,
        },
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`ElevenLabs could not speak. Try again in a minute. (${response.status})`);
  }
  return response;
}

/** The sound of one sentence as an MP3 file, from the cache when it holds one. */
async function speechFile(
  text: string,
  voice: CloudVoice
): Promise<{ blob: Blob; fromCache: boolean }> {
  const id = await speechBlobId(text, voice);
  const kept = await keptBlob(id);
  if (kept) return { blob: kept, fromCache: true };
  const blob = await (await elevenLabsSpeech(text, voice, false)).blob();
  await keepBlob(id, blob);
  return { blob, fromCache: false };
}

/**
 * The same sentence, with the time of every character in it.
 *
 * A video caption marks the word being said, so it needs the alignment that
 * only the cloud voice returns. The store keeps the sound and the timing
 * together, so a second export of one note costs nothing.
 */
export async function synthesizeTimed(
  text: string,
  voice: CloudVoice
): Promise<{ blob: Blob; alignment: SpeechAlignment }> {
  const soundId = `${await speechBlobId(text, voice)}:timed`;
  const timingId = `${soundId}:alignment`;
  const [sound, timing] = await Promise.all([keptBlob(soundId), keptBlob(timingId)]);
  if (sound && timing) {
    return { blob: sound, alignment: JSON.parse(await timing.text()) as SpeechAlignment };
  }

  const spoken = (await (await elevenLabsSpeech(text, voice, true)).json()) as {
    audio_base64: string;
    alignment: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    } | null;
  };
  if (!spoken.alignment) throw new Error('That voice returned no word timing.');

  const bytes = Uint8Array.from(atob(spoken.audio_base64), character => character.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  const alignment: SpeechAlignment = {
    characters: spoken.alignment.characters,
    start_times: spoken.alignment.character_start_times_seconds,
    end_times: spoken.alignment.character_end_times_seconds,
  };
  await keepBlob(soundId, blob);
  await keepBlob(timingId, new Blob([JSON.stringify(alignment)], { type: 'application/json' }));
  return { blob, alignment };
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let finishActiveAudio: (() => void) | null = null;
let stopStream: (() => void) | null = null;

function clearActiveAudio(): void {
  const audio = activeAudio;
  const url = activeAudioUrl;
  activeAudio = null;
  activeAudioUrl = null;
  const finish = finishActiveAudio;
  finishActiveAudio = null;
  finish?.();
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
  }
  if (url) URL.revokeObjectURL(url);
}

/** Plays one file to the end, on the output the user chose. */
async function playBlob(blob: Blob): Promise<void> {
  clearActiveAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudio = audio;
  activeAudioUrl = url;
  try {
    const output = await audioOutput();
    if (output && 'setSinkId' in audio) {
      await (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(
        output
      );
    }
    if (activeAudio !== audio) return;
    await new Promise<void>((resolve, reject) => {
      finishActiveAudio = resolve;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('The voice file could not play.'));
      audio.play().catch(reject);
    });
  } finally {
    if (activeAudio === audio) clearActiveAudio();
  }
}

/** Plays a file unless the sentence was stopped first. */
async function playFile(
  file: { blob: Blob; fromCache: boolean },
  started: number,
  signal: AbortSignal
): Promise<{ fromCache: boolean; latencyMs: number }> {
  const latencyMs = Date.now() - started;
  if (!signal.aborted) await playBlob(file.blob);
  return { fromCache: file.fromCache, latencyMs };
}

/** Speaks one sentence from an ElevenLabs MP3 file. */
async function streamFile(
  text: string,
  voice: CloudVoice,
  signal: AbortSignal
): Promise<{ fromCache: boolean; latencyMs: number }> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('ElevenLabs sent no sound in time.')), FILE_AUDIO_MS);
  });
  try {
    return playFile(await Promise.race([speechFile(text, voice), late]), started, signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Plays 16-bit mono samples at 24 kHz, each chunk after the one before it.
 *
 * A chunk can end inside a sample, so the odd byte waits for the next chunk.
 * `onEnded` runs each time a chunk stops playing.
 */
function pcmPlayer(output: string, onEnded: () => void) {
  const context = new AudioContext({ sampleRate: STREAM_RATE });
  if (output && 'setSinkId' in context) {
    // An output that went away leaves the sound on the default output.
    void (context as AudioContext & { setSinkId(id: string): Promise<void> })
      .setSinkId(output)
      .catch(() => undefined);
  }
  const sources: AudioBufferSourceNode[] = [];
  let carry: number | null = null;
  let playhead = 0;

  const player = {
    /** Every sample that played, for the kept WAV file. */
    chunks: [] as Uint8Array[],
    /** The chunks that are scheduled and not yet finished. */
    playing: 0,
    /** The time of the first sound, or 0 before it. */
    firstAudio: 0,
    play(audio: string) {
      let bytes = Uint8Array.from(atob(audio), character => character.charCodeAt(0));
      if (carry !== null) {
        const joined = new Uint8Array(bytes.length + 1);
        joined[0] = carry;
        joined.set(bytes, 1);
        bytes = joined;
        carry = null;
      }
      if (bytes.length % 2 === 1) {
        carry = bytes[bytes.length - 1];
        bytes = bytes.subarray(0, bytes.length - 1);
      }
      if (bytes.length === 0) return;

      player.chunks.push(bytes);
      const samples = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const buffer = context.createBuffer(1, bytes.length / 2, STREAM_RATE);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index++) {
        channel[index] = samples.getInt16(index * 2, true) / 32768;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      playhead = Math.max(playhead, context.currentTime);
      source.start(playhead);
      playhead += buffer.duration;
      sources.push(source);
      player.playing += 1;
      source.onended = () => {
        player.playing -= 1;
        onEnded();
      };
      if (!player.firstAudio) player.firstAudio = Date.now();
    },
    /** Stops every chunk now. */
    silence() {
      for (const source of sources) {
        source.onended = null;
        source.stop();
      }
      player.close();
    },
    close() {
      void context.close().catch(() => undefined);
    },
  };
  return player;
}

/** The samples of a sentence that played, and the time of its first sound. */
type Heard = { chunks: Uint8Array[]; firstAudio: number };

/** What a request tells the player of `playArriving`. */
interface Feed {
  play(audio: string): void;
  fail(message: string): void;
  /** The last sound has arrived. */
  done(): void;
}

/**
 * Plays the samples of one ElevenLabs request as they arrive.
 *
 * `start` begins the request, gives it the feed, and returns the step that
 * cancels it. The promise resolves with the samples when the last one plays,
 * or with null after a stop. A failure after the first sound is an
 * interruption.
 */
async function playArriving(
  firstAudioMs: number,
  signal: AbortSignal,
  start: (feed: Feed) => () => void
): Promise<Heard | null> {
  stopStream?.();
  const output = await audioOutput();
  return new Promise((resolve, reject) => {
    const player = pcmPlayer(output, () => finishWhenPlayed());
    let final = false;
    let settled = false;
    let cancel = () => {};

    const end = () => {
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', stop);
      if (stopStream === stop) stopStream = null;
      cancel();
    };
    const fail = (message: string) => {
      if (settled) return;
      end();
      player.silence();
      reject(player.firstAudio ? new InterruptedSpeech(message) : new Error(message));
    };
    function stop() {
      if (settled) return;
      end();
      player.silence();
      resolve(null);
    }
    function finishWhenPlayed() {
      if (settled || !final || player.playing > 0) return;
      end();
      player.close();
      resolve({ chunks: player.chunks, firstAudio: player.firstAudio });
    }

    const timer = setTimeout(() => {
      if (!player.firstAudio) fail('ElevenLabs sent no sound in time.');
    }, firstAudioMs);
    stopStream = stop;
    signal.addEventListener('abort', stop, { once: true });

    cancel = start({
      play: audio => {
        if (!settled) player.play(audio);
      },
      fail,
      done: () => {
        if (settled) return;
        if (!player.firstAudio) {
          fail('ElevenLabs sent no sound.');
          return;
        }
        final = true;
        finishWhenPlayed();
      },
    });
    if (settled) cancel();
  });
}

/**
 * Plays the samples of the ElevenLabs dialogue socket as they arrive.
 *
 * The socket sends `audio`, the `is_final` mark, and a `message` for a problem.
 */
function playSocket(
  url: string,
  messages: object[],
  firstAudioMs: number,
  signal: AbortSignal
): Promise<Heard | null> {
  return playArriving(firstAudioMs, signal, feed => {
    const socket = new WebSocket(url);
    let final = false;

    socket.onopen = () => {
      for (const message of messages) socket.send(JSON.stringify(message));
    };
    socket.onmessage = event => {
      let reply: {
        audio?: string | null;
        is_final?: boolean | null;
        message?: string;
        error?: string;
      };
      try {
        reply = JSON.parse(String(event.data));
      } catch {
        feed.fail('ElevenLabs sent a reply September could not read.');
        return;
      }
      const problem = reply.message ?? reply.error;
      if (problem) {
        feed.fail(problem);
        return;
      }
      if (reply.audio) feed.play(reply.audio);
      if (reply.is_final) {
        final = true;
        feed.done();
      }
    };
    socket.onerror = () => feed.fail('ElevenLabs could not speak. Try again in a minute.');
    socket.onclose = () => {
      if (!final) feed.fail('ElevenLabs closed the voice before the end.');
    };
    return () => {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
    };
  });
}

/**
 * Speaks one sentence in the ElevenLabs Dialogue voice while its sound arrives.
 *
 * Eleven v3 streams over HTTP. Eleven v3 Conversational has only the dialogue
 * socket. A text longer than one request holds goes in parts, one after the
 * other. The store keeps a complete sentence as a WAV file, and a kept
 * sentence plays without a request.
 */
async function streamDialogue(
  text: string,
  voice: CloudVoice,
  parts: string[],
  signal: AbortSignal
): Promise<{ fromCache: boolean; latencyMs: number }> {
  const started = Date.now();
  const cacheId = `${await blobId('dialogue', {
    text,
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    stability: voice.stability,
  })}:pcm`;

  const kept = await keptBlob(cacheId);
  if (kept) return playFile({ blob: kept, fromCache: true }, started, signal);
  if (signal.aborted) return { fromCache: false, latencyMs: 0 };

  const heard =
    voice.modelId === CONVERSATIONAL_MODEL
      ? await playSocket(
          `wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=${voice.modelId}&output_format=pcm_${STREAM_RATE}`,
          [
            {
              voices: [voice.voiceId],
              voice_settings: { stability: voice.stability },
              xi_api_key: await providerKey('elevenlabs'),
            },
            ...parts.map(part => ({ inputs: [{ text: part, voice_id: voice.voiceId }] })),
            { close_socket: true },
          ],
          DIALOGUE_FIRST_AUDIO_MS,
          signal
        )
      : await playDialogue(parts, voice, signal);
  if (!heard) return { fromCache: false, latencyMs: 0 };
  await keepBlob(cacheId, wavFile(heard.chunks));
  return { fromCache: false, latencyMs: heard.firstAudio - started };
}

/**
 * The complete JSON objects at the start of `text`, and the rest.
 *
 * The dialogue stream sends one object after the other. A line break between
 * them is optional, and an object can arrive in pieces.
 */
function takeObjects(text: string): { objects: string[]; rest: string } {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;
  let used = 0;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        objects.push(text.slice(start, index + 1));
        used = index + 1;
      }
    }
  }
  return { objects, rest: text.slice(used) };
}

/** Plays the parts of a dialogue request, one after the other, as their sound arrives. */
function playDialogue(
  parts: string[],
  voice: CloudVoice,
  signal: AbortSignal
): Promise<Heard | null> {
  return playArriving(DIALOGUE_FIRST_AUDIO_MS, signal, feed => {
    const request = new AbortController();

    const speakPart = async (text: string) => {
      const key = await providerKey('elevenlabs');
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_${STREAM_RATE}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'xi-api-key': key },
          body: JSON.stringify({
            inputs: [{ text, voice_id: voice.voiceId }],
            model_id: voice.modelId,
            settings: { stability: voice.stability },
          }),
          signal: request.signal,
        }
      );
      if (response.status === 401 || response.status === 403) {
        throw new Error('ElevenLabs did not accept the key. Check it in Settings.');
      }
      if (!response.ok || !response.body) {
        throw new Error(`ElevenLabs could not speak. Try again in a minute. (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let waiting = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (request.signal.aborted) return;
        if (done) break;
        const { objects, rest } = takeObjects(waiting + decoder.decode(value, { stream: true }));
        waiting = rest;
        for (const object of objects) {
          const reply = JSON.parse(object) as { audio_base64?: string | null };
          if (reply.audio_base64) feed.play(reply.audio_base64);
        }
      }
      // A stream that ends inside a reply lost sound, so the sentence is not whole.
      if ((waiting + decoder.decode()).trim()) {
        throw new Error('ElevenLabs ended the voice inside a reply.');
      }
    };

    void (async () => {
      try {
        for (const part of parts) {
          await speakPart(part);
          if (request.signal.aborted) return;
        }
      } catch (reason) {
        feed.fail(reason instanceof Error ? reason.message : String(reason));
        return;
      }
      feed.done();
    })();
    return () => request.abort();
  });
}

/** 16-bit mono samples in a WAV file, which every browser can play. */
function wavFile(chunks: Uint8Array[]): Blob {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = new DataView(new ArrayBuffer(44));
  const write = (offset: number, word: string) =>
    [...word].forEach((character, index) =>
      header.setUint8(offset + index, character.charCodeAt(0))
    );
  write(0, 'RIFF');
  header.setUint32(4, 36 + size, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, STREAM_RATE, true);
  header.setUint32(28, STREAM_RATE * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  write(36, 'data');
  header.setUint32(40, size, true);
  return new Blob([header.buffer, ...(chunks as BlobPart[])], { type: 'audio/wav' });
}

export const voice: PlatformVoice = {
  systemName: 'browser system voice',
  systemDescription: 'Built into this browser. Free, and it works without an account.',

  async speakSystem(text, chosen, onWord) {
    if (!('speechSynthesis' in window)) throw new Error('This browser has no system voice.');
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = chosen.speed;
      if (chosen.voiceId) {
        utterance.voice =
          speechSynthesis
            .getVoices()
            .find(one => one.voiceURI === chosen.voiceId || one.name === chosen.voiceId) ?? null;
      }
      utterance.onboundary = event => {
        if (event.name === 'word') onWord?.(event.charIndex);
      };
      utterance.onend = () => resolve();
      utterance.onerror = event => reject(new Error(event.error || 'The browser voice stopped.'));
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
  },

  stream: (text, chosen, parts, signal) =>
    parts ? streamDialogue(text, chosen, parts, signal) : streamFile(text, chosen, signal),

  async stop() {
    window.speechSynthesis?.cancel();
    stopStream?.();
    clearActiveAudio();
  },

  synthesize: async (text, chosen) => (await speechFile(text, chosen)).blob,
};
