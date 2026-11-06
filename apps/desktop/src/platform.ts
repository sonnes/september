/**
 * The Mac platform. Rust holds the rows in SQLite, the keys in the Keychain,
 * and the voices in the native audio engine. The shared screens reach this
 * object as `@platform/adapter`.
 */

import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-shell";

import {
  InterruptedSpeech,
  type Platform,
  type PlatformStore,
} from "@september/app-ui/platform";
import { listedVoices } from "@september/core/rules/voice";

import packageMetadata from "../package.json";
import { call, callRaw } from "./commands";

const store: PlatformStore = {
  getSetting: async <T,>(key: string) =>
    ((await call("setting_get", { request: { key } })) as T | null) ?? null,
  putSetting: async (key, value) => {
    await call("setting_put", { request: { key, value } });
  },
  listSpaces: (user_id) => call("space_list", { request: { user_id } }),
  getSpace: (id) => call("space_get", { request: { id } }),
  putSpace: (space) => call("space_put", { request: space }),
  patchSpace: (patch) => call("space_patch", { request: patch }),
  deleteSpace: (id) => call("space_delete", { request: { id } }),
  listMessages: (spaceId) =>
    call("message_list", { request: { space_id: spaceId ?? null } }),
  getMessage: (id) => call("message_get", { request: { id } }),
  putMessage: (message) => call("message_put", { request: message }),
  deleteMessage: (id) => call("message_delete", { request: { id } }),
  listAgentMessages: (space_id) => call("agent_message_list", { request: { space_id } }),
  putAgentMessage: (message) => call("agent_message_put", { request: message }),
  updateAgentToolState: (id, expected, state, content, updated_at) =>
    call("agent_tool_state", { request: { id, expected, state, content, updated_at } }),
  listNotes: (spaceId) => call("note_list", { request: { space_id: spaceId ?? null } }),
  getNote: (id) => call("note_get", { request: { id } }),
  putNote: (note) => call("note_put", { request: note }),
  deleteNote: (id) => call("note_delete", { request: { id } }),
  listPhrases: (spaceId) => call("phrase_list", { request: { space_id: spaceId ?? null } }),
  putPhrase: (phrase) => call("phrase_put", { request: phrase }),
  deletePhrase: (id) => call("phrase_delete", { request: { id } }),
  replaceAiPhrases: (space_id, phrases) =>
    call("phrase_replace_ai", { request: { space_id, phrases } }),
  putUsageEvent: async (event) => {
    await call("analytics_put", { request: event });
  },
  listUsageEvents: (user_id, start_at, end_at) =>
    call("analytics_list", { request: { user_id, start_at, end_at } }),
  exportBackup: () => call("backup_export"),
  importBackup: (stored) => call("backup_import", { request: stored }),
};

/** A WebView download. The file never leaves the Mac first. */
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The multipart body as raw bytes, with the boundary in its content type. */
async function rawForm(form: FormData): Promise<{ bytes: Uint8Array; contentType: string }> {
  const request = new Request("http://ipc.localhost", { method: "POST", body: form });
  const contentType = request.headers.get("content-type");
  if (!contentType) throw new Error("Could not prepare the voice samples.");
  return { bytes: new Uint8Array(await request.arrayBuffer()), contentType };
}

/** Typed as the interface, so shared code sees every optional member. */
export const platform: Platform = {
  app: { source: "desktop", version: packageMetadata.version },
  store,
  voice: {
    systemName: "macOS system voice",
    systemDescription: "Built into macOS. Free, and it works without a network.",
    // The native voice does not report its words, so `onWord` is never called.
    speakSystem: (text, { voiceId, speed }) =>
      call("speech_system", { request: { text, voice_id: voiceId, speed } }),
    // Rust plays the sound, and a stop goes through `stop`, so the signal is not sent.
    async stream(text, voice, dialogueParts) {
      const heard = await call("speech_stream", {
        request: { text, voice, ...(dialogueParts ? { dialogueParts } : {}) },
      });
      if (heard.interrupted) throw new InterruptedSpeech(heard.interrupted);
      return { fromCache: heard.from_cache, latencyMs: heard.latency_ms };
    },
    stop: () => call("speech_native_stop"),
    async synthesize(text, voice) {
      const { path } = await call("speech_synthesize", { request: { text, voice } });
      return (await fetch(convertFileSrc(path))).blob();
    },
  },
  providers: {
    status: () => call("provider_status"),
    connect: (provider, key) => call("provider_connect", { request: { provider, key } }),
    async connectOpenRouter(signal) {
      signal.throwIfAborted();
      const requestId = crypto.randomUUID();
      const cancel = () => {
        call("openrouter_cancel", { requestId }).catch((reason: unknown) =>
          console.warn("September could not cancel the OpenRouter sign-in.", reason),
        );
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        return await call("openrouter_connect", { requestId });
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    },
    forget: (provider) => call("provider_forget", { request: { provider } }),
    voices: async () => listedVoices(await call("provider_voices")),
    quota: () => call("provider_quota"),
    async cloneVoice(form) {
      const { bytes, contentType } = await rawForm(form);
      return callRaw<{ id: string }>("provider_clone_voice", bytes, {
        "content-type": contentType,
      });
    },
  },
  writing: {
    async openrouter() {
      const { baseUrl, token } = await call("writing_proxy");
      return { baseUrl, key: token };
    },
    apple: {
      status: () => call("apfel_status"),
      async endpoint() {
        const { appleUrl, token } = await call("writing_proxy");
        return { baseUrl: appleUrl, key: token };
      },
    },
  },
  device: {
    async identity() {
      const [name, userId] = await Promise.all([
        call("user_name"),
        // A Mac with no login name gives the rows the local owner.
        call("user_id").catch(() => null),
      ]);
      return { name, userId };
    },
    openInBrowser: (url) => open(url),
    guardUnsavedChanges() {
      const warn = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", warn);
      let active = true;
      const native = getCurrentWindow().onCloseRequested((event) => {
        if (active) event.preventDefault();
      });
      return () => {
        window.removeEventListener("beforeunload", warn);
        active = false;
        void native.then((unlisten) => unlisten());
      };
    },
    save,
    outputs: {
      list: () => call("audio_outputs"),
      current: () => call("audio_output"),
      choose: (uid) => call("audio_output_set", { request: { uid } }),
    },
    fullScreen: (on) => call("panel_present", { on }),
    virtualMicrophone: {
      status: () => call("virtual_microphone_status"),
      start: () => call("virtual_microphone_start"),
      stop: () => call("virtual_microphone_stop"),
    },
  },
  capabilities: { dashboard: false, eyeTracker: true, floatingPanel: true },
};
