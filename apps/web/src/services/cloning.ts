import { providerKey } from "@/services/os";

export const MAX_VOICE_SAMPLE_BYTES = 25 * 1024 * 1024;
export const MAX_VOICE_CLONE_BYTES = 100 * 1024 * 1024;

export interface VoiceCloneInput {
  files: File[];
  name: string;
  description?: string;
}

export interface CreatedVoice {
  id: string;
  name: string;
}

let lastCreatedVoice: CreatedVoice | null = null;

/** Carries one optimistic clone from its route back to the Voice list. */
export function rememberCreatedVoice(created: CreatedVoice): void {
  lastCreatedVoice = created;
}

export function recentCreatedVoice(): CreatedVoice | null {
  return lastCreatedVoice;
}

/** Keeps an optimistic clone visible while ElevenLabs updates its account list. */
export function keepCreatedVoice<T extends { id: string }>(
  fresh: T[],
  created: T | null,
): T[] {
  if (!created || fresh.some((voice) => voice.id === created.id)) return fresh;
  return [created, ...fresh];
}

type VoiceSampleFile = Pick<File, "name" | "size" | "type">;

/** Returns the one problem the form must fix before it calls ElevenLabs. */
export function validateVoiceClone({
  files,
  name,
}: {
  files: VoiceSampleFile[];
  name: string;
}): string | null {
  if (files.length === 0) return "Add at least one voice sample.";
  if (!name.trim()) return "Give this voice a name.";

  for (const file of files) {
    if (file.type && !file.type.startsWith("audio/")) {
      return `${file.name} is not an audio file.`;
    }
    if (file.size > MAX_VOICE_SAMPLE_BYTES) {
      return `${file.name} is larger than 25 MB.`;
    }
  }
  return null;
}

export function validateVoiceCloneBytes(size: number): string | null {
  return size > MAX_VOICE_CLONE_BYTES
    ? "Voice samples are larger than 100 MB in total."
    : null;
}

/** Encodes once so raw IPC can carry audio without a JSON or base64 copy. */
export async function encodeVoiceClone(input: VoiceCloneInput): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  const form = new FormData();
  for (const file of input.files) form.append("files", file);
  form.append("name", input.name.trim());
  if (input.description?.trim()) {
    form.append("description", input.description.trim());
  }
  form.append("labels", JSON.stringify({ app: "september" }));

  const request = new Request("http://ipc.localhost", {
    method: "POST",
    body: form,
  });
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("Could not prepare the voice samples.");

  return {
    bytes: new Uint8Array(await request.arrayBuffer()),
    contentType,
  };
}

/** Creates a voice directly from this browser with the locally stored key. */
export async function cloneVoice(input: VoiceCloneInput): Promise<CreatedVoice> {
  const problem = validateVoiceClone(input);
  if (problem) throw new Error(problem);

  const sizeProblem = validateVoiceCloneBytes(
    input.files.reduce((total, file) => total + file.size, 0),
  );
  if (sizeProblem) throw new Error(sizeProblem);
  const key = providerKey("elevenlabs");
  if (!key) throw new Error("Connect ElevenLabs in Settings first.");
  const form = new FormData();
  for (const file of input.files) form.append("files", file);
  form.append("name", input.name.trim());
  if (input.description?.trim()) form.append("description", input.description.trim());
  form.append("labels", JSON.stringify({ app: "september" }));
  const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!response.ok)
    throw new Error(`ElevenLabs could not create the voice. Try again in a minute. (${response.status})`);
  const created = (await response.json()) as { voice_id: string };
  return { id: created.voice_id, name: input.name.trim() };
}

export type RecordingStatus = "idle" | "recording" | "error";

interface RecorderCallbacks {
  onComplete?: (id: string, blob: Blob) => void;
  onStatus?: (id: string, status: RecordingStatus) => void;
  onError?: (id: string, message: string) => void;
}

interface RecordingEntry {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: BlobPart[];
}

const RECORDING_TYPES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
] as const;

/** Owns the exclusive microphone and releases every track it acquires. */
export class MediaRecorderManager {
  private active = new Map<string, RecordingEntry>();
  private callbacks: RecorderCallbacks;
  private generation = 0;

  constructor(callbacks: RecorderCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: RecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  async start(id: string): Promise<void> {
    const generation = ++this.generation;
    this.stopActive();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (reason) {
      if (generation !== this.generation) return;
      const message =
        reason instanceof Error ? reason.message : "Microphone access was denied.";
      this.callbacks.onStatus?.(id, "error");
      this.callbacks.onError?.(id, message);
      return;
    }

    if (generation !== this.generation) {
      stopTracks(stream);
      return;
    }

    let recorder: MediaRecorder;
    try {
      const mimeType = RECORDING_TYPES.find(
        (type) =>
          typeof MediaRecorder.isTypeSupported !== "function" ||
          MediaRecorder.isTypeSupported(type),
      );
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (reason) {
      stopTracks(stream);
      this.callbacks.onStatus?.(id, "error");
      this.callbacks.onError?.(
        id,
        reason instanceof Error ? reason.message : "Could not start the recorder.",
      );
      return;
    }
    const entry: RecordingEntry = { recorder, stream, chunks: [] };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) entry.chunks.push(event.data);
    };
    recorder.onstop = () => {
      this.active.delete(id);
      stopTracks(stream);
      const type = recorder.mimeType || firstBlobType(entry.chunks) || "audio/mp4";
      const blob = new Blob(entry.chunks, { type });
      this.callbacks.onStatus?.(id, "idle");
      if (blob.size > 0) this.callbacks.onComplete?.(id, blob);
    };
    recorder.onerror = () => {
      this.active.delete(id);
      stopTracks(stream);
      this.callbacks.onStatus?.(id, "error");
      this.callbacks.onError?.(id, "The recording stopped unexpectedly.");
    };

    this.active.set(id, entry);
    try {
      recorder.start();
    } catch (reason) {
      this.active.delete(id);
      stopTracks(stream);
      this.callbacks.onStatus?.(id, "error");
      this.callbacks.onError?.(
        id,
        reason instanceof Error ? reason.message : "Could not start the recorder.",
      );
      return;
    }
    this.callbacks.onStatus?.(id, "recording");
  }

  stop(id: string): void {
    const entry = this.active.get(id);
    if (!entry) return;
    this.active.delete(id);
    if (entry.recorder.state !== "inactive") entry.recorder.stop();
    stopTracks(entry.stream);
  }

  stopAll(): void {
    this.generation += 1;
    this.stopActive();
  }

  private stopActive(): void {
    for (const id of [...this.active.keys()]) this.stop(id);
  }

  /** Tears down without sending a late completion into an unmounted screen. */
  dispose(): void {
    this.callbacks = {};
    this.stopAll();
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function firstBlobType(parts: BlobPart[]): string | undefined {
  return parts.find((part): part is Blob => part instanceof Blob)?.type || undefined;
}

/** Gives ElevenLabs a filename that agrees with the bytes WKWebView recorded. */
export function recordingFile(id: string, blob: Blob): File {
  const type = blob.type || "audio/mp4";
  const extension = type.includes("mp4")
    ? "m4a"
    : type.includes("webm")
      ? "webm"
      : type.includes("ogg")
        ? "ogg"
        : type.includes("wav")
          ? "wav"
          : "audio";
  return new File([blob], `${id}.${extension}`, { type });
}

interface PlayingSample {
  id: string;
  audio: HTMLAudioElement;
  url: string;
}

/** Plays one local sample and owns its temporary object URL. */
export class SamplePlayer {
  private current: PlayingSample | null = null;
  private readonly onFinish: (id: string) => void;

  constructor(onFinish: (id: string) => void = () => undefined) {
    this.onFinish = onFinish;
  }

  async play(id: string, blob: Blob): Promise<boolean> {
    this.stop();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.current = { id, audio, url };
    audio.onended = () => this.finish(id);
    audio.onerror = () => this.finish(id);

    try {
      await audio.play();
      return this.current?.id === id;
    } catch (reason) {
      this.finish(id);
      throw reason;
    }
  }

  stop(): void {
    if (!this.current) return;
    this.current.audio.pause();
    this.current.audio.currentTime = 0;
    this.finish(this.current.id);
  }

  dispose(): void {
    this.stop();
  }

  private finish(id: string): void {
    if (this.current?.id !== id) return;
    URL.revokeObjectURL(this.current.url);
    this.current = null;
    this.onFinish(id);
  }
}
