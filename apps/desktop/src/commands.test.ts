/**
 * The contract between `Commands` and the Rust commands.
 *
 * `Commands` and `RawCommands` type each example below, so a change to a type
 * fails the build.
 * The same examples are in `contract/commands.json`. The Rust tests in
 * `src-tauri/src/rpc/contract.rs` read that file. They fail when a command
 * has no example, when an example names no command, when a request has a
 * field that its Rust type does not have, or when Rust writes an answer with
 * other names. Run
 * `UPDATE_CONTRACT=1 pnpm test` to write the file again.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

import type { Commands, RawCommands } from "./commands";

type Name = Exclude<keyof Commands, "gaze_start">;
type Example<N extends Name> = {
  args: Commands[N]["args"] extends undefined ? null : Commands[N]["args"];
  result: Commands[N]["result"] extends void ? null : Commands[N]["result"];
};

const space = {
  id: "s1",
  user_id: "ravi",
  title: "Family",
  context: "Home",
  phrases_synced_count: 3,
  created_at: 1,
  updated_at: 2,
};
const message = {
  id: "m1",
  space_id: "s1",
  user_id: "ravi",
  text: "Hello",
  type: "user",
  created_at: 1,
};
const agentMessage = {
  id: "a1",
  space_id: "s1",
  role: "tool" as const,
  content: "{}",
  tool_call_id: "c1",
  tool_name: "read_note" as const,
  tool_arguments: "{}",
  tool_state: "pending" as const,
  created_at: 1,
  updated_at: 2,
};
const note = { id: "n1", space_id: "s1", name: "Plan", content: "# Plan", created_at: 1, updated_at: 2 };
const phrase = {
  id: "p1",
  space_id: "s1",
  text: "Thank you",
  kind: "phrase" as const,
  code: "ty",
  pinned: true,
  created_at: 1,
  updated_at: 2,
};
const usage = {
  id: "u1",
  user_id: "ravi",
  event_type: "tts_generation" as const,
  timestamp: 5,
  data: { characters: 9 },
};
const voice = { voiceId: "v1", modelId: "eleven_v3", stability: 0.5, similarity: 0.75, speed: 1 };
const backup = {
  settings: { "dismissed-ideas": ["idea"] },
  spaces: [space],
  messages: [message],
  agentMessages: [agentMessage],
  notes: [note],
  savedPhrases: [phrase],
  usageEvents: [usage],
};
const status = { provider: "elevenlabs" as const, connected: true, label: "Pro", detail: null };
const microphone = { active: true, name: "September", uid: "mic", detail: null };

const EXAMPLES: { [N in Name]: Example<N> } = {
  setting_get: { args: { request: { key: "speech" } }, result: { speed: 1 } },
  setting_put: { args: { request: { key: "speech", value: { speed: 1 } } }, result: { speed: 1 } },
  backup_export: {
    args: { request: { settingKeys: ["speech"], usageSince: 4 } },
    result: backup,
  },
  backup_import: { args: { request: { contents: backup, settingKeys: ["speech"] } }, result: null },
  space_list: { args: { request: { user_id: "ravi" } }, result: [space] },
  space_get: { args: { request: { id: "s1" } }, result: space },
  space_put: { args: { request: space }, result: space },
  space_patch: {
    args: {
      request: {
        id: "s1",
        title: "Family",
        context: "Home",
        phrases_synced_count: 3,
        reset_phrases_synced_count: true,
        updated_at: 2,
      },
    },
    result: space,
  },
  space_delete: { args: { request: { id: "s1" } }, result: true },
  message_list: { args: { request: { space_id: "s1" } }, result: [message] },
  message_get: { args: { request: { id: "m1" } }, result: message },
  message_put: { args: { request: message }, result: message },
  message_delete: { args: { request: { id: "m1" } }, result: true },
  agent_message_list: { args: { request: { space_id: "s1" } }, result: [agentMessage] },
  agent_message_put: { args: { request: agentMessage }, result: agentMessage },
  agent_tool_state: {
    args: {
      request: { id: "a1", expected: "pending", state: "applied", content: "{}", updated_at: 2 },
    },
    result: agentMessage,
  },
  note_list: { args: { request: { space_id: "s1" } }, result: [note] },
  note_get: { args: { request: { id: "n1" } }, result: note },
  note_put: { args: { request: note }, result: note },
  note_delete: { args: { request: { id: "n1" } }, result: true },
  phrase_list: { args: { request: { space_id: "s1" } }, result: [phrase] },
  phrase_put: { args: { request: phrase }, result: phrase },
  phrase_delete: { args: { request: { id: "p1" } }, result: true },
  phrase_replace_ai: { args: { request: { space_id: "s1", phrases: [phrase] } }, result: null },
  analytics_put: { args: { request: usage }, result: usage },
  analytics_list: {
    args: { request: { user_id: "ravi", start_at: 1, end_at: 9, since: 0 } },
    result: [usage],
  },
  user_name: { args: null, result: "Ravi" },
  user_id: { args: null, result: "ravi" },
  speech_system: { args: { request: { text: "Hello", speed: 1 } }, result: null },
  speech_stream: {
    args: { request: { text: "Hello", voice, dialogueParts: ["Hello"] } },
    result: { from_cache: false, latency_ms: 120, interrupted: "The output changed." },
  },
  speech_synthesize: {
    args: { request: { text: "Hello", voice } },
    result: { path: "/audio/a.mp3" },
  },
  speech_native_stop: { args: null, result: null },
  apfel_status: { args: null, result: { supported: true, available: false, reason: "Off" } },
  writing_proxy: {
    args: null,
    result: { baseUrl: "http://127.0.0.1:1/v1", appleUrl: "http://127.0.0.1:1/apple", token: "t" },
  },
  provider_status: { args: null, result: [status] },
  provider_connect: { args: { request: { provider: "elevenlabs", key: "xi" } }, result: status },
  provider_forget: { args: { request: { provider: "openrouter" } }, result: true },
  provider_voices: {
    args: null,
    result: [
      { id: "v1", name: "Mine", preview_url: "https://x/v1.mp3", category: "cloned", is_owner: true },
    ],
  },
  provider_quota: {
    args: null,
    result: { tier: "starter", character_count: 10, character_limit: 100, resets_at: 99 },
  },
  openrouter_connect: { args: { request: { requestId: "r1" } }, result: status },
  openrouter_cancel: { args: { request: { requestId: "r1" } }, result: null },
  audio_outputs: { args: null, result: [{ uid: "speakers", name: "Speakers" }] },
  audio_output: { args: null, result: "speakers" },
  audio_output_set: { args: { request: { uid: "speakers" } }, result: null },
  virtual_microphone_status: { args: null, result: microphone },
  virtual_microphone_start: { args: null, result: microphone },
  virtual_microphone_stop: { args: null, result: microphone },
  panel_show: { args: null, result: null },
  panel_hide: { args: null, result: null },
  panel_setup: { args: { request: { on: true } }, result: null },
  panel_float: { args: null, result: true },
  panel_set_float: { args: { request: { on: true } }, result: null },
  panel_present: { args: { request: { on: true } }, result: null },
  gaze_stop: { args: null, result: null },
};

const RAW_EXAMPLES: { [N in keyof RawCommands]: { args: null; result: RawCommands[N]["result"] } } = {
  provider_clone_voice: { args: null, result: { id: "v1" } },
};

const FIXTURE = join(process.cwd(), "contract/commands.json");

it("holds the examples that the Rust tests read", () => {
  const written = `${JSON.stringify({ ...EXAMPLES, ...RAW_EXAMPLES }, null, 2)}\n`;
  if (process.env.UPDATE_CONTRACT) writeFileSync(FIXTURE, written);
  expect(readFileSync(FIXTURE, "utf8")).toBe(written);
});
