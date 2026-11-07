import { platform } from "@platform/adapter";
import { validateVoiceClone } from "@september/core/rules/voice-clone";

export interface VoiceCloneInput {
  files: File[];
  name: string;
  description?: string;
}

export interface CreatedVoice {
  id: string;
  name: string;
}

/** Creates an ElevenLabs voice from the samples. */
export async function cloneVoice(input: VoiceCloneInput): Promise<CreatedVoice> {
  const problem = validateVoiceClone(input);
  if (problem) throw new Error(problem);

  const form = new FormData();
  for (const file of input.files) form.append("files", file);
  form.append("name", input.name.trim());
  if (input.description?.trim()) form.append("description", input.description.trim());
  form.append("labels", JSON.stringify({ app: "september" }));
  const created = await platform.providers.cloneVoice(form);
  return { id: created.id, name: input.name.trim() };
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
