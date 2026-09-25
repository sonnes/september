import { authorizeOpenRouter } from './oauth';
import { modelSettingsFrom } from '@september/core/rules/model-config';
import { DEFAULT_DRAFT, type OnboardingDraft } from '@/rules/onboarding';
import { panelStateFrom, type PanelState } from '@/rules/panel';
import { presentSettings, type PresentSettings, type SpeechAlignment } from '@/rules/present';
import { getRepository } from '@/services/repository';
import {
  CONVERSATIONAL_MODEL,
  DIALOGUE_MODEL,
  dialogueModelFrom,
  dialogueParts,
  stabilityFor,
} from '@september/core/rules/voice';
import { fileSound } from '@september/core/rules/audio-tags';
import { moodFrom, type MoodKey } from '@september/core/rules/moods';
import type { SpeechSettings } from '@/services/speech';

export const osName = '';
export const LOCAL_USER = 'local-user';

export type SavedSetup = OnboardingDraft & { id: string };

let setup: SavedSetup | null = null;
let lastPath: string | null = null;
let speech: SpeechSettings | null = null;
let panel: PanelState = panelStateFrom(null);
let present: PresentSettings = presentSettings(null);
let providerKeys: Partial<Record<Provider, string>> = {};
let selectedOutput = '';
let bootstrapped = false;

export const dismissedIdeas: string[] = [];
export const spaceModes: Record<string, string> = {};
/** The voices heard lately on the Voice screen, newest first. */
export const heardVoiceIds: string[] = [];

/** Loads the small settings cache before the router chooses its first screen. */
export async function bootstrapBrowserServices(): Promise<void> {
  if (bootstrapped) return;
  const repository = await getRepository();
  const [
    savedSetup,
    savedPath,
    savedSpeech,
    savedDismissed,
    savedModes,
    savedPanel,
    savedPresent,
    keys,
    output,
    savedHeard,
  ] = await Promise.all([
    repository.getSetting<SavedSetup>('setup'),
    repository.getSetting<string>('lastPath'),
    repository.getSetting<SpeechSettings>('speech'),
    repository.getSetting<string[]>('dismissed-ideas'),
    repository.getSetting<Record<string, string>>('space-modes'),
    repository.getSetting<unknown>('panel-open'),
    repository.getSetting<unknown>('present'),
    repository.getSetting<Partial<Record<Provider, string>>>('provider-keys'),
    repository.getSetting<string>('audio-output'),
    repository.getSetting<string[]>('heard-voices'),
  ]);
  // Every other setting here is normalised as it is read. This one was
  // not, so a setup written before `defaultModel` existed threw on the
  // first screen that read it.
  setup = savedSetup && {
    ...savedSetup,
    ...modelSettingsFrom(savedSetup),
    autoSuggestions: savedSetup.autoSuggestions ?? true,
    autoPhrases: savedSetup.autoPhrases ?? true,
    agentEnabled: savedSetup.agentEnabled ?? true,
  };
  lastPath = savedPath;
  speech = savedSpeech;
  dismissedIdeas.splice(0, dismissedIdeas.length, ...(savedDismissed ?? []));
  Object.assign(spaceModes, savedModes ?? {});
  panel = panelStateFrom(savedPanel);
  present = presentSettings(savedPresent);
  providerKeys = keys ?? {};
  selectedOutput = output ?? '';
  heardVoiceIds.splice(0, heardVoiceIds.length, ...(savedHeard ?? []));
  bootstrapped = true;
}

const setupListeners = new Set<() => void>();
let setupWrite: Promise<unknown> = Promise.resolve();

export function subscribeSetup(listener: () => void): () => void {
  setupListeners.add(listener);
  return () => {
    setupListeners.delete(listener);
  };
}

export function currentSetup(): SavedSetup | null {
  return setup;
}

export function currentUserId(): string {
  return setup?.id ?? LOCAL_USER;
}

export async function saveSetup(draft: OnboardingDraft): Promise<void> {
  const saved: SavedSetup = { ...draft, id: setup?.id ?? LOCAL_USER };
  await (await getRepository()).putSetting('setup', saved);
  setup = saved;
  setupListeners.forEach((listener) => listener());
}

export function updateSetup(patch: Partial<OnboardingDraft>): Promise<SavedSetup> {
  const write = setupWrite.then(async () => {
    const saved: SavedSetup = {
      ...(setup ?? { id: LOCAL_USER, ...DEFAULT_DRAFT }),
      ...patch,
    };
    await (await getRepository()).putSetting('setup', saved);
    setup = saved;
    setupListeners.forEach((listener) => listener());
    return saved;
  });
  setupWrite = write.catch(() => undefined);
  return write;
}

export function currentPath(): string | null {
  return lastPath;
}

export async function savePath(path: string): Promise<void> {
  if (path === lastPath) return;
  lastPath = path;
  await (await getRepository()).putSetting('lastPath', path);
}

export const openInBrowser = async (url: string): Promise<void> => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export function currentSpeech(): SpeechSettings | null {
  return speech;
}

export async function saveSpeech(settings: SpeechSettings): Promise<void> {
  await (await getRepository()).putSetting('speech', settings);
  speech = settings;
}

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let finishActiveAudio: (() => void) | null = null;

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
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

function elevenLabsKey(): string {
  const key = providerKeys.elevenlabs;
  if (!key) throw new Error('Connect ElevenLabs in Settings first.');
  return key;
}

async function speechBlobId(text: string, settings: SpeechSettings): Promise<string> {
  return blobId('speech', {
    text,
    voiceId: settings.voiceId,
    modelId: settings.modelId,
    stability: settings.stability,
    similarity: settings.similarity,
    speed: settings.speed,
  });
}

/** A cache key: the prefix and the SHA-256 hash of the fields. */
async function blobId(prefix: string, fields: object): Promise<string> {
  const input = new TextEncoder().encode(JSON.stringify(fields));
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}:${hash}`;
}

export async function synthesizeSpeech(
  words: string,
  chosen: SpeechSettings
): Promise<{ path: string; from_cache: boolean }> {
  const { text, settings } = fileSound(words, chosen);
  if (!settings.voiceId) throw new Error('Choose an ElevenLabs voice first.');
  const cacheId = await speechBlobId(text, settings);
  let repository: Awaited<ReturnType<typeof getRepository>> | null = null;
  try {
    repository = await getRepository();
    const cached = await repository.getBlob(cacheId);
    if (cached) return { path: URL.createObjectURL(cached), from_cache: true };
  } catch {
    // Speech remains available when private storage is denied or full.
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(settings.voiceId)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': elevenLabsKey(),
      },
      body: JSON.stringify({
        text,
        model_id: settings.modelId,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity,
          speed: settings.speed,
        },
      }),
    }
  );
  if (!response.ok)
    throw new Error(`ElevenLabs could not speak. Try again in a minute. (${response.status})`);
  const speechFile = await response.blob();
  try {
    await repository?.putBlob(cacheId, speechFile);
  } catch {
    // The new file can still play even when the cache write fails.
  }
  return { path: URL.createObjectURL(speechFile), from_cache: false };
}

/**
 * The same sentence, with the time of every character in it.
 *
 * A video caption highlights the word being said, so it needs the alignment
 * that only the cloud voice returns. The sound and the timing are cached
 * together, in the same bounded store as the rest of the speech, so a second
 * export of one note costs nothing.
 */
export async function synthesizeTimed(
  words: string,
  chosen: SpeechSettings
): Promise<{ blob: Blob; alignment: SpeechAlignment }> {
  const { text, settings } = fileSound(words, chosen);
  if (!settings.voiceId) throw new Error('Choose an ElevenLabs voice first.');
  const cacheId = `${await speechBlobId(text, settings)}:timed`;
  const timingId = `${cacheId}:alignment`;
  let repository: Awaited<ReturnType<typeof getRepository>> | null = null;

  try {
    repository = await getRepository();
    const [sound, timing] = await Promise.all([
      repository.getBlob(cacheId),
      repository.getBlob(timingId),
    ]);
    if (sound && timing) {
      return {
        blob: sound,
        alignment: JSON.parse(await timing.text()) as SpeechAlignment,
      };
    }
  } catch {
    // A denied or full private store never stops an export.
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      settings.voiceId
    )}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': elevenLabsKey(),
      },
      body: JSON.stringify({
        text,
        model_id: settings.modelId,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity,
          speed: settings.speed,
        },
      }),
    }
  );
  if (!response.ok)
    throw new Error(`ElevenLabs could not speak. Try again in a minute. (${response.status})`);

  const spoken = (await response.json()) as {
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

  try {
    await repository?.putBlob(cacheId, blob);
    await repository?.putBlob(
      timingId,
      new Blob([JSON.stringify(alignment)], { type: 'application/json' })
    );
  } catch {
    // The export still finishes when the cache write fails.
  }

  return { blob, alignment };
}

export async function speakSystem(text: string, settings: SpeechSettings): Promise<void> {
  if (!('speechSynthesis' in window)) throw new Error('This browser has no system voice.');
  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speed;
    if (settings.voiceId) {
      utterance.voice =
        speechSynthesis
          .getVoices()
          .find(voice => voice.voiceURI === settings.voiceId || voice.name === settings.voiceId) ??
        null;
    }
    utterance.onend = () => resolve();
    utterance.onerror = event => reject(new Error(event.error || 'The browser voice stopped.'));
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}

export async function playSpeechFile(path: string): Promise<void> {
  clearActiveAudio();
  const audio = new Audio(path);
  activeAudio = audio;
  activeAudioUrl = path;
  try {
    if (selectedOutput && 'setSinkId' in audio) {
      await (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(
        selectedOutput
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

export async function stopNativeSpeech(): Promise<void> {
  window.speechSynthesis?.cancel();
  stopStream?.();
  clearActiveAudio();
}

/** The voice socket sends 16-bit mono samples at this rate. */
const STREAM_RATE = 24_000;
/** A voice that sends no sound in this time does not answer. */
const FIRST_AUDIO_MS = 5_000;
/** The ElevenLabs models that the voice socket does not accept. */
const FILE_ONLY_MODELS = ['eleven_v3'];

/**
 * The cloud voice broke after its first sound. The listener heard part of the
 * sentence, so a second voice must not say it again.
 */
export class InterruptedSpeech extends Error {}

let stopStream: (() => void) | null = null;

/**
 * Speaks one sentence in the cloud voice while its sound arrives.
 *
 * The first sound plays before ElevenLabs finishes the sentence. A complete
 * sentence is kept as a WAV file, and a kept sentence plays without the
 * socket. A model without a socket plays as a file. The promise resolves when
 * the sound stops.
 */
export async function streamSpeech(
  text: string,
  settings: SpeechSettings,
  signal?: AbortSignal
): Promise<{ from_cache: boolean; latency_ms: number }> {
  if (settings.provider === 'dialogue') return streamDialogue(text, settings, signal);
  const started = Date.now();
  if (!settings.voiceId) throw new Error('Choose an ElevenLabs voice first.');

  if (FILE_ONLY_MODELS.includes(settings.modelId)) {
    return playFile(await synthesizeSpeech(text, settings), started, signal);
  }

  const cacheId = await speechBlobId(text, settings);
  const kept = await keptSpeech(cacheId);
  if (kept) return playFile({ path: URL.createObjectURL(kept), from_cache: true }, started, signal);
  if (signal?.aborted) return { from_cache: false, latency_ms: 0 };

  const heard = await playStream(text, settings, signal);
  if (!heard) return { from_cache: false, latency_ms: 0 };
  try {
    await (await getRepository()).putBlob(`${cacheId}:pcm`, wavFile(heard.chunks));
  } catch {
    // The sentence was heard. A failed write costs only a second request.
  }
  return { from_cache: false, latency_ms: heard.firstAudio - started };
}

/** Plays a speech file, or frees it when the sentence was stopped first. */
async function playFile(
  file: { path: string; from_cache: boolean },
  started: number,
  signal?: AbortSignal
): Promise<{ from_cache: boolean; latency_ms: number }> {
  const latency_ms = Date.now() - started;
  if (signal?.aborted) {
    if (file.path.startsWith('blob:')) URL.revokeObjectURL(file.path);
  } else {
    await playSpeechFile(file.path);
  }
  return { from_cache: file.from_cache, latency_ms };
}

/** The WAV file of a streamed sentence, or else the MP3 file of the file path. */
async function keptSpeech(cacheId: string): Promise<Blob | null> {
  return (await keptBlob(`${cacheId}:pcm`)) ?? (await keptBlob(cacheId));
}

/**
 * Plays 16-bit mono samples at 24 kHz, each chunk after the one before it.
 *
 * A chunk can end inside a sample, so the odd byte waits for the next chunk.
 * `onEnded` runs each time a chunk stops playing.
 */
function pcmPlayer(onEnded: () => void) {
  const context = new AudioContext({ sampleRate: STREAM_RATE });
  if (selectedOutput && 'setSinkId' in context) {
    void (context as AudioContext & { setSinkId(id: string): Promise<void> })
      .setSinkId(selectedOutput)
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

/** Speaks one sentence through the text-to-speech socket of ElevenLabs. */
function playStream(
  text: string,
  settings: SpeechSettings,
  signal?: AbortSignal
): Promise<{ chunks: Uint8Array[]; firstAudio: number } | null> {
  return playSocket(
    `wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      settings.voiceId ?? ''
    )}/stream-input?model_id=${encodeURIComponent(settings.modelId)}&output_format=pcm_${STREAM_RATE}`,
    [
      {
        text: ' ',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity,
          speed: settings.speed,
        },
        xi_api_key: elevenLabsKey(),
      },
      { text: `${text} `, flush: true },
      { text: '' },
    ],
    FIRST_AUDIO_MS,
    signal
  );
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
function playArriving(
  firstAudioMs: number,
  signal: AbortSignal | undefined,
  start: (feed: Feed) => () => void
): Promise<Heard | null> {
  stopStream?.();
  return new Promise((resolve, reject) => {
    const player = pcmPlayer(() => finishWhenPlayed());
    let final = false;
    let settled = false;
    let cancel = () => {};

    const end = () => {
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
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
    signal?.addEventListener('abort', stop, { once: true });

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
 * Plays the samples of an ElevenLabs socket as they arrive.
 *
 * The text-to-speech socket and the dialogue socket send the same kind of
 * replies: `audio`, a final mark, and a `message` for a problem. Only the
 * final mark is spelled `isFinal` in one and `is_final` in the other.
 */
function playSocket(
  url: string,
  messages: object[],
  firstAudioMs: number,
  signal?: AbortSignal
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
        isFinal?: boolean | null;
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
      if (reply.isFinal || reply.is_final) {
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

/** Eleven v3 starts to speak later than Flash, so it gets more time. */
const DIALOGUE_FIRST_AUDIO_MS = 10_000;

/**
 * Speaks one sentence in the ElevenLabs Dialogue voice while its sound arrives.
 *
 * The voice is Eleven v3 or Eleven v3 Conversational, so the sentence keeps
 * its audio tags. Eleven v3 streams over HTTP. Eleven v3 Conversational has
 * only the dialogue socket. A text longer than one request holds goes in
 * parts, one after the other. A complete sentence is kept as a WAV file, and a
 * kept sentence plays without a request.
 */
async function streamDialogue(
  text: string,
  settings: SpeechSettings,
  signal?: AbortSignal
): Promise<{ from_cache: boolean; latency_ms: number }> {
  const started = Date.now();
  if (!settings.voiceId) throw new Error('Choose an ElevenLabs voice first.');
  const stability = stabilityFor(DIALOGUE_MODEL, settings.stability);
  const model = dialogueModelFrom(settings.dialogueModelId);
  const cacheId = `${await blobId('dialogue', {
    text,
    voiceId: settings.voiceId,
    modelId: model,
    stability,
  })}:pcm`;

  const kept = await keptBlob(cacheId);
  if (kept) return playFile({ path: URL.createObjectURL(kept), from_cache: true }, started, signal);
  if (signal?.aborted) return { from_cache: false, latency_ms: 0 };

  const voiceId = settings.voiceId;
  const parts = dialogueParts(text);
  const heard =
    model === CONVERSATIONAL_MODEL
      ? await playSocket(
          `wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=${model}&output_format=pcm_${STREAM_RATE}`,
          [
            { voices: [voiceId], voice_settings: { stability }, xi_api_key: elevenLabsKey() },
            ...parts.map(part => ({ inputs: [{ text: part, voice_id: voiceId }] })),
            { close_socket: true },
          ],
          DIALOGUE_FIRST_AUDIO_MS,
          signal
        )
      : await playDialogue(parts, voiceId, stability, signal);
  if (!heard) return { from_cache: false, latency_ms: 0 };
  try {
    await (await getRepository()).putBlob(cacheId, wavFile(heard.chunks));
  } catch {
    // The sentence was heard. A failed write costs only a second request.
  }
  return { from_cache: false, latency_ms: heard.firstAudio - started };
}

async function keptBlob(id: string): Promise<Blob | null> {
  try {
    return (await (await getRepository()).getBlob(id)) ?? null;
  } catch {
    // Speech remains available when private storage is denied or full.
    return null;
  }
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
  voiceId: string,
  stability: number,
  signal?: AbortSignal
): Promise<Heard | null> {
  return playArriving(DIALOGUE_FIRST_AUDIO_MS, signal, feed => {
    const request = new AbortController();

    const speakPart = async (text: string) => {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-dialogue/stream/with-timestamps?output_format=pcm_${STREAM_RATE}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'xi-api-key': elevenLabsKey() },
          body: JSON.stringify({
            inputs: [{ text, voice_id: voiceId }],
            model_id: DIALOGUE_MODEL,
            settings: { stability },
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

export const audioUrl = (path: string) => path;

export async function rememberDismissed(texts: string[]): Promise<void> {
  dismissedIdeas.splice(0, dismissedIdeas.length, ...texts);
  await (await getRepository()).putSetting('dismissed-ideas', texts);
}

export async function rememberHeardVoices(ids: string[]): Promise<void> {
  heardVoiceIds.splice(0, heardVoiceIds.length, ...ids);
  await (await getRepository()).putSetting('heard-voices', ids);
}

export async function rememberModes(modes: Record<string, string>): Promise<void> {
  Object.assign(spaceModes, modes);
  await (await getRepository()).putSetting('space-modes', modes);
}

/** Protect a normal close while local edits are pending or failed. */
export function guardUnsavedChanges(): () => void {
  const warn = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", warn);
  return () => {
    window.removeEventListener("beforeunload", warn);
  };
}

/** Unsent words are local settings, separate from the spoken transcript. */
export async function readTalkDraft(spaceId: string): Promise<string> {
  return (await (await getRepository()).getSetting<string>(`talk-draft:${spaceId}`)) ?? '';
}

export async function saveTalkDraft(spaceId: string, words: string): Promise<void> {
  await (await getRepository()).putSetting(`talk-draft:${spaceId}`, words);
}

/** The mood of a Talk space. It stays until the user presses its key again. */
export async function readTalkMood(spaceId: string): Promise<MoodKey | null> {
  return moodFrom(await (await getRepository()).getSetting<string>(`talk-mood:${spaceId}`));
}

export async function saveTalkMood(spaceId: string, mood: MoodKey | null): Promise<void> {
  await (await getRepository()).putSetting(`talk-mood:${spaceId}`, mood);
}

export function currentPanel(): PanelState {
  return panel;
}

export async function rememberPanel(state: PanelState): Promise<void> {
  panel = state;
  await (await getRepository()).putSetting('panel-open', state);
}

/**
 * The tone of the last presentation, and whether it spoke.
 *
 * A user picks a colour once. Asking again at the start of every story would
 * put a choice between the user and the words they came to say.
 */
export function currentPresent(): PresentSettings {
  return present;
}

export async function rememberPresent(settings: PresentSettings): Promise<void> {
  present = settings;
  await (await getRepository()).putSetting('present', settings);
}

export type Provider = 'openrouter' | 'elevenlabs';

export interface ProviderStatus {
  provider: Provider;
  connected: boolean;
  label: string | null;
  detail: string | null;
}

export interface AppleStatus {
  supported: boolean;
  available: boolean;
  reason: string | null;
}

export interface Voice {
  id: string;
  name: string;
  preview_url: string | null;
  /** `premade`, `cloned`, `generated`, `professional`, and more, from ElevenLabs. */
  category?: string | null;
  /** True for a voice the user made. A library voice they added is false. */
  is_owner?: boolean | null;
}

export interface WritingModel {
  id: string;
  name: string;
  free: boolean;
}

export interface Model {
  id: string;
  name: string;
  description: string | null;
}

export interface Connections {
  apple: AppleStatus;
  openrouter: ProviderStatus;
  elevenlabs: ProviderStatus;
}

const absent = (provider: Provider): ProviderStatus => ({
  provider,
  connected: false,
  label: null,
  detail: null,
});

export const BLANK_CONNECTIONS: Connections = {
  apple: {
    supported: false,
    available: false,
    reason: 'Apple Intelligence is available in the macOS app.',
  },
  openrouter: absent('openrouter'),
  elevenlabs: absent('elevenlabs'),
};

function providerStatus(provider: Provider): ProviderStatus {
  return providerKeys[provider]
    ? {
        provider,
        connected: true,
        label: 'Connected',
        detail: 'Stored in this browser',
      }
    : absent(provider);
}

export async function readConnections(): Promise<Connections> {
  return {
    apple: BLANK_CONNECTIONS.apple,
    openrouter: providerStatus('openrouter'),
    elevenlabs: providerStatus('elevenlabs'),
  };
}

/** A browser service reads its locally stored key without exposing it to a component. */
export function providerKey(provider: Provider): string | null {
  return providerKeys[provider] ?? null;
}

/** The name a message shows. The stored id is an identifier, not copy. */
const PROVIDER_NAMES: Record<Provider, string> = {
  openrouter: 'OpenRouter',
  elevenlabs: 'ElevenLabs',
};

async function verifyProvider(provider: Provider, key: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(
    provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/key'
      : 'https://api.elevenlabs.io/v1/user',
    {
      headers:
        provider === 'openrouter' ? { authorization: `Bearer ${key}` } : { 'xi-api-key': key },
      signal,
    }
  );
  if (!response.ok)
    throw new Error(`${PROVIDER_NAMES[provider]} did not accept that key. Copy it and try again.`);
}

export async function connectOpenRouter(signal: AbortSignal): Promise<ProviderStatus> {
  const key = await authorizeOpenRouter(signal);
  signal.throwIfAborted();
  return connectProvider('openrouter', key, signal);
}

export async function connectProvider(provider: Provider, key: string, signal?: AbortSignal): Promise<ProviderStatus> {
  const trimmed = key.trim();
  await verifyProvider(provider, trimmed, signal);
  signal?.throwIfAborted();
  const nextKeys = { ...providerKeys, [provider]: trimmed };
  await (await getRepository()).putSetting('provider-keys', nextKeys);
  providerKeys = nextKeys;
  return providerStatus(provider);
}

export async function forgetProvider(provider: Provider): Promise<boolean> {
  const existed = Boolean(providerKeys[provider]);
  const { [provider]: _removed, ...rest } = providerKeys;
  providerKeys = rest;
  await (await getRepository()).putSetting('provider-keys', providerKeys);
  return existed;
}

async function providerJson<T>(provider: Provider, url: string): Promise<T> {
  const key = providerKeys[provider];
  if (!key) throw new Error(`Connect ${PROVIDER_NAMES[provider]} in Settings first.`);
  const response = await fetch(url, {
    headers: provider === 'openrouter' ? { authorization: `Bearer ${key}` } : { 'xi-api-key': key },
  });
  if (!response.ok)
    throw new Error(
      `${PROVIDER_NAMES[provider]} did not answer. Try again in a minute. (${response.status})`
    );
  return response.json() as Promise<T>;
}

export async function listVoices(): Promise<Voice[]> {
  const answer = await providerJson<{
    voices: Array<{
      voice_id: string;
      name: string;
      preview_url?: string;
      category?: string;
      is_owner?: boolean;
    }>;
  }>('elevenlabs', 'https://api.elevenlabs.io/v1/voices');
  return answer.voices.map(voice => ({
    id: voice.voice_id,
    name: voice.name,
    preview_url: voice.preview_url ?? null,
    category: voice.category ?? null,
    is_owner: voice.is_owner ?? null,
  }));
}

export async function listModels(): Promise<Model[]> {
  const rows = await providerJson<Array<{ model_id: string; name: string; description?: string }>>(
    'elevenlabs',
    'https://api.elevenlabs.io/v1/models'
  );
  return rows.map(model => ({
    id: model.model_id,
    name: model.name,
    description: model.description ?? null,
  }));
}

export async function listWritingModels(): Promise<WritingModel[]> {
  const answer = await providerJson<{
    data: Array<{
      id: string;
      name: string;
      pricing?: { prompt?: string; completion?: string };
    }>;
  }>('openrouter', 'https://openrouter.ai/api/v1/models');
  return answer.data.map(model => ({
    id: model.id,
    name: model.name,
    free:
      model.id.endsWith(':free') ||
      (Number(model.pricing?.prompt ?? 1) === 0 && Number(model.pricing?.completion ?? 1) === 0),
  }));
}

export interface AudioOutput {
  uid: string;
  name: string;
}

export async function listOutputs(): Promise<AudioOutput[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  return (await navigator.mediaDevices.enumerateDevices())
    .filter(device => device.kind === 'audiooutput')
    .map(device => ({
      uid: device.deviceId,
      name: device.label || 'Audio output',
    }));
}

export async function currentOutput(): Promise<string> {
  return selectedOutput;
}

export async function chooseOutput(uid: string): Promise<void> {
  selectedOutput = uid;
  await (await getRepository()).putSetting('audio-output', uid);
}

export interface VirtualMicrophoneStatus {
  active: boolean;
  name: string;
  uid: string;
  detail: string | null;
}

export function isVirtualDeviceAvailable(status: { uid: string } | null | undefined): boolean {
  return Boolean(status && status.uid !== 'unavailable-in-browser');
}

const browserMicrophone: VirtualMicrophoneStatus = {
  active: false,
  name: 'September Microphone',
  uid: 'unavailable-in-browser',
  detail: null,
};

export const virtualMicrophoneStatus = async () => browserMicrophone;
export const startVirtualMicrophone = async () => browserMicrophone;
export const stopVirtualMicrophone = async () => browserMicrophone;
