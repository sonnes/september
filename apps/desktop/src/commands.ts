/**
 * Every Tauri command the WebView calls, with its arguments and its answer.
 *
 * `call` is the one way to reach Rust. A command that takes a `request`
 * struct gets its arguments under `request`. The rest name their arguments
 * at the top level, as Tauri reads them.
 */

import { invoke, type Channel, type InvokeArgs } from "@tauri-apps/api/core";

import type {
  AppleStatus,
  AudioOutput,
  CloudVoice,
  ElevenLabsQuota,
  Provider,
  ProviderStatus,
  VirtualMicrophoneStatus,
  Voice,
} from "@september/app-ui/platform";
import type { StoredBackup } from "@september/core/rules/backup";
import type {
  AgentMessage,
  AgentToolState,
  Message,
  Note,
  SavedPhrase,
  Space,
  SpacePatch,
} from "@september/core/rules/records";
import type { UsageEvent } from "@september/core/rules/usage-summary";

import type { FileSettings } from "./rules/voice-file";
import type { GazeEvent } from "./services/gaze";

type Command<Args, Result> = { args: Args; result: Result };
/** A cloud voice with the settings that name its voice file. */
type NamedVoice = CloudVoice & { fileSettings: FileSettings };
/** A command that takes its arguments under `request`. */
type Request<Args, Result> = Command<{ request: Args }, Result>;

export interface Commands {
  setting_get: Request<{ key: string }, unknown>;
  setting_put: Request<{ key: string; value: unknown }, unknown>;
  backup_export: Request<{ settingKeys: readonly string[]; usageSince: number }, StoredBackup>;
  backup_import: Request<{ contents: StoredBackup; settingKeys: readonly string[] }, void>;

  space_list: Request<{ user_id: string }, Space[]>;
  space_get: Request<{ id: string }, Space | null>;
  space_put: Request<Space, Space>;
  space_patch: Request<SpacePatch, Space>;
  space_delete: Request<{ id: string }, boolean>;
  message_list: Request<{ space_id: string | null }, Message[]>;
  message_get: Request<{ id: string }, Message | null>;
  message_put: Request<Message, Message>;
  message_delete: Request<{ id: string }, boolean>;
  agent_message_list: Request<{ space_id: string }, AgentMessage[]>;
  agent_message_put: Request<AgentMessage, AgentMessage>;
  agent_tool_state: Request<
    {
      id: string;
      expected: AgentToolState;
      state: AgentToolState;
      content: string;
      updated_at: number;
    },
    AgentMessage
  >;
  note_list: Request<{ space_id: string | null }, Note[]>;
  note_get: Request<{ id: string }, Note | null>;
  note_put: Request<Note, Note>;
  note_delete: Request<{ id: string }, boolean>;
  phrase_list: Request<{ space_id: string | null }, SavedPhrase[]>;
  phrase_put: Request<SavedPhrase, SavedPhrase>;
  phrase_delete: Request<{ id: string }, boolean>;
  phrase_replace_ai: Request<{ space_id: string; phrases: SavedPhrase[] }, void>;
  analytics_put: Request<UsageEvent, UsageEvent>;
  analytics_list: Request<
    { user_id: string; start_at: number; end_at: number; since: number },
    UsageEvent[]
  >;

  user_name: Command<undefined, string>;
  /** The login name, or null when the system gives none. */
  user_id: Command<undefined, string | null>;

  speech_system: Request<{ text: string; speed: number }, void>;
  speech_stream: Request<
    { text: string; voice: NamedVoice; dialogueParts?: string[] },
    { from_cache: boolean; latency_ms: number; interrupted: string | null }
  >;
  speech_synthesize: Request<
    { text: string; voice: NamedVoice },
    { path: string }
  >;
  speech_native_stop: Command<undefined, void>;

  apfel_status: Command<undefined, AppleStatus>;
  writing_proxy: Command<undefined, { baseUrl: string; appleUrl: string; token: string }>;
  provider_status: Command<undefined, ProviderStatus[]>;
  provider_connect: Request<{ provider: Provider; key: string }, ProviderStatus>;
  provider_forget: Request<{ provider: Provider }, boolean>;
  provider_voices: Command<undefined, Voice[]>;
  provider_quota: Command<undefined, ElevenLabsQuota | null>;
  openrouter_connect: Request<{ requestId: string }, ProviderStatus>;
  openrouter_cancel: Request<{ requestId: string }, void>;

  audio_outputs: Command<undefined, AudioOutput[]>;
  audio_output: Command<undefined, string>;
  audio_output_set: Request<{ uid: string }, void>;
  virtual_microphone_status: Command<undefined, VirtualMicrophoneStatus>;
  virtual_microphone_start: Command<undefined, VirtualMicrophoneStatus>;
  virtual_microphone_stop: Command<undefined, VirtualMicrophoneStatus>;

  panel_show: Command<undefined, void>;
  panel_hide: Command<undefined, void>;
  panel_setup: Request<{ on: boolean }, void>;
  panel_float: Command<undefined, boolean>;
  panel_set_float: Request<{ on: boolean }, void>;
  panel_present: Request<{ on: boolean }, void>;

  gaze_start: Command<{ onEvent: Channel<GazeEvent> }, void>;
  gaze_stop: Command<undefined, void>;
}

type Name = keyof Commands;
type ArgsOf<N extends Name> = Commands[N]["args"];

/**
 * One call to Rust.
 *
 * A Tauri command rejects with a string, not an Error. A screen that reads
 * `error.message` then shows nothing, so every rejection becomes an Error.
 */
export async function call<N extends Name>(
  name: N,
  ...args: ArgsOf<N> extends undefined ? [] : [ArgsOf<N>]
): Promise<Commands[N]["result"]> {
  try {
    return await invoke<Commands[N]["result"]>(name, args[0] as InvokeArgs | undefined);
  } catch (reason) {
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
}

/** The commands that take a raw body, with their answers. */
export interface RawCommands {
  provider_clone_voice: { result: { id: string } };
}

/** One call with a raw body, which keeps audio out of JSON. */
export async function callRaw<N extends keyof RawCommands>(
  name: N,
  body: Uint8Array,
  headers: Record<string, string>,
): Promise<RawCommands[N]["result"]> {
  try {
    return await invoke<RawCommands[N]["result"]>(name, body, { headers });
  } catch (reason) {
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
}
