/**
 * What each app supplies to the shared screens and services.
 *
 * The interface holds only the work that differs between the browser and the
 * Mac. Each app exports one `platform` that satisfies it, and the shared code
 * reaches that object through `@platform/adapter`. A member that ends in `?`
 * is a capability: it is absent where the platform cannot do the work.
 */

import type { AgentRuntimeAdapter } from "@september/core/rules/agent/loop";
import type { BackupSource, StoredBackup } from "@september/core/rules/backup";
import type { Capabilities } from "@september/core/rules/navigation";
import type { PresentToneKey } from "@september/core/rules/present/stage";
import type { Message, Note, SavedPhrase, Space } from "@september/core/rules/records";
import type { UsageEvent } from "@september/core/rules/usage-summary";
import type { CloudSound } from "@september/core/rules/voice";

export type { Capabilities };

/** The rows and settings of the app. Every write rejects when it fails. */
export interface PlatformStore extends Omit<AgentRuntimeAdapter, "openWriter"> {
  getSetting<T>(key: string): Promise<T | null>;
  putSetting(key: string, value: unknown): Promise<void>;
  putSpace(space: Space): Promise<Space>;
  deleteSpace(id: string): Promise<boolean>;
  /** Every message of every space when `spaceId` is absent. */
  listMessages(spaceId?: string): Promise<Message[]>;
  /** Every note of every space when `spaceId` is absent. */
  listNotes(spaceId?: string): Promise<Note[]>;
  /** Puts the rows of a model in place of the unpinned rows of one space. */
  replaceAiPhrases(spaceId: string, phrases: SavedPhrase[]): Promise<void>;
  putUsageEvent(event: UsageEvent): Promise<void>;
  listUsageEvents(userId: string, startAt: number, endAt: number): Promise<UsageEvent[]>;
  /** One consistent copy of every portable row and setting. */
  exportBackup(): Promise<StoredBackup>;
  /** Replaces every portable row and setting, and keeps the device settings. */
  importBackup(stored: StoredBackup): Promise<void>;
}

/** One cloud voice, with the values its model takes. */
export interface CloudVoice extends CloudSound {
  voiceId: string;
}

/**
 * The cloud voice broke after its first sound. The listener heard part of the
 * sentence, so a second voice must not say it again.
 */
export class InterruptedSpeech extends Error {}

export interface PlatformVoice {
  /** The model name that usage records for the system voice. */
  systemName: string;
  /** What setup says about the system voice. */
  systemDescription: string;
  /** Speaks with the voice of the system. `onWord` hears where each word starts. */
  speakSystem(text: string, speed: number, onWord?: (charIndex: number) => void): Promise<void>;
  /**
   * Speaks one sentence in a cloud voice and resolves when the sound stops.
   * `dialogueParts` holds the parts for the Dialogue voice. It rejects with
   * `InterruptedSpeech` when the sound broke after it began.
   */
  stream(
    text: string,
    voice: CloudVoice,
    dialogueParts: string[] | undefined,
    signal: AbortSignal,
  ): Promise<{ fromCache: boolean; latencyMs: number }>;
  /** Stops every voice now. */
  stop(): Promise<void>;
  /** The sound of one sentence in a cloud voice, as a file. */
  synthesize(text: string, voice: CloudVoice): Promise<Blob>;
}

export type Provider = "openrouter" | "elevenlabs";

/** What one cloud service reports. It never carries the key. */
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

export interface ElevenLabsQuota {
  tier: string | null;
  character_count: number;
  character_limit: number;
  /** Unix seconds, as ElevenLabs gives them. */
  resets_at: number | null;
}

export interface PlatformProviders {
  /** One status for each cloud service. */
  status(): Promise<ProviderStatus[]>;
  /** Tests the key, then keeps it. A key that fails is never kept. */
  connect(provider: Provider, key: string): Promise<ProviderStatus>;
  /** Signs in to OpenRouter in the browser and keeps the key it returns. */
  connectOpenRouter(signal: AbortSignal): Promise<ProviderStatus>;
  forget(provider: Provider): Promise<boolean>;
  /** The ElevenLabs voices of the account, empty without a key. */
  voices(): Promise<Voice[]>;
  /** The ElevenLabs allowance, or null without a key. */
  quota(): Promise<ElevenLabsQuota | null>;
  /** Creates an ElevenLabs voice from a multipart form of samples. */
  cloneVoice(form: FormData): Promise<{ id: string }>;
}

/** Where a writing model answers, and the key the request carries. */
export interface Endpoint {
  baseUrl: string;
  key: string;
}

export interface PlatformWriting {
  openrouter(): Promise<Endpoint>;
  /** Apple Intelligence, on a platform that can run it. */
  apple?: {
    status(): Promise<AppleStatus>;
    endpoint(): Promise<Endpoint>;
  };
}

export interface AudioOutput {
  /** The name that lasts across a restart and a replug. */
  uid: string;
  /** The name the user reads, for example `Mac mini Speakers`. */
  name: string;
}

export interface VirtualMicrophoneStatus {
  active: boolean;
  name: string;
  uid: string;
  /** What to check when a caller hears nothing. */
  detail: string | null;
}

export type VideoStage = "voice" | "frames" | "video";

export interface PlatformDevice {
  /** The name of the person the system knows, and the login name. */
  identity(): Promise<{ name: string; userId: string | null }>;
  /** Opens an address outside the app window. */
  openInBrowser(url: string): Promise<void>;
  /** Asks before a close while edits are not saved. Returns the release. */
  guardUnsavedChanges(): () => void;
  /** Saves a file to the computer of the user. */
  save(blob: Blob, filename: string): void;
  outputs: {
    list(): Promise<AudioOutput[]>;
    current(): Promise<string>;
    choose(uid: string): Promise<void>;
  };
  /** Fills the screen with the window while Present shows. */
  fullScreen?(on: boolean): Promise<void>;
  /** A system input that calling apps can choose, which carries the voice. */
  virtualMicrophone?: {
    status(): Promise<VirtualMicrophoneStatus>;
    start(): Promise<VirtualMicrophoneStatus>;
    stop(): Promise<VirtualMicrophoneStatus>;
  };
  /** A film of the words with captions, in one cloud voice. */
  renderVideo?(input: {
    text: string;
    voice: CloudVoice;
    tone: PresentToneKey;
    onStage?: (stage: VideoStage) => void;
  }): Promise<Blob>;
}

export interface Platform {
  /** The app that writes a backup, and its version. */
  app: { source: BackupSource; version: string };
  store: PlatformStore;
  voice: PlatformVoice;
  providers: PlatformProviders;
  writing: PlatformWriting;
  device: PlatformDevice;
  capabilities: Capabilities;
}
