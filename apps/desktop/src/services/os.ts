import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

import type { OnboardingDraft } from "@/rules/onboarding";
import type { SpeechSettings } from "@/services/speech";

/**
 * The name the operating system holds for the signed-in user.
 *
 * ponytail: a top-level await runs before React mounts, so the onboarding
 * draft can start with the name and no effect has to race the first render.
 * The value is empty in a browser, where the Tauri backend does not exist.
 */
export const osName = await invoke<string>("user_name").catch(() => "");

/** The identifier the app uses when the system knows no login name. */
export const LOCAL_USER = "local";

/** The login name of the operating system, for example `ravi`. */
const osUser =
  (await invoke<string>("user_id").catch(() => "")) || LOCAL_USER;

/**
 * The setup answers, from the last time setup finished. Null on a fresh
 * install, and in a browser, where the Tauri backend does not exist.
 *
 * ponytail: one setting, read once before React mounts, so the router can
 * decide the first route without an async guard.
 */
/** The finished setup, with the identifier of the owner beside its answers. */
export type SavedSetup = OnboardingDraft & { id: string };

let setup = await invoke<SavedSetup | null>("setting_get", {
  request: { key: "setup" },
}).catch(() => null);

export function currentSetup(): SavedSetup | null {
  return setup;
}

/**
 * The owner of every space and every message.
 *
 * Setup freezes the identifier, so a later read of the operating system
 * cannot move the spaces of the user to a new owner. A user who renames the
 * account of the Mac keeps them.
 */
export function currentUserId(): string {
  return currentSetup()?.id ?? osUser;
}

/** Keeps the finished setup, then holds it, so the app guard sees it too. */
export async function saveSetup(draft: OnboardingDraft): Promise<void> {
  const saved: SavedSetup = { ...draft, id: osUser };
  await invoke("setting_put", {
    request: { key: "setup", value: saved },
  }).catch(() => undefined);
  setup = saved;
}

/**
 * Changes some of the setup answers, and holds the new ones.
 *
 * Settings writes through here, so `currentSetup()` gives the new answer at
 * once. A screen never has to reload to see its own change.
 */
export async function updateSetup(
  patch: Partial<OnboardingDraft>,
): Promise<SavedSetup> {
  const saved: SavedSetup = { ...setup!, ...patch };
  await invoke("setting_put", {
    request: { key: "setup", value: saved },
  }).catch(() => undefined);
  setup = saved;
  return saved;
}

/**
 * The screen the user left last.
 *
 * ponytail: one more read before React mounts, beside `setup`, so the router
 * picks the first route with no async guard. Without it the app paints the
 * dashboard first, and then moves.
 */
let lastPath = await invoke<string | null>("setting_get", {
  request: { key: "lastPath" },
}).catch(() => null);

export function currentPath(): string | null {
  return lastPath;
}

/** Keeps the screen the user is on. The router calls this on each arrival. */
export async function savePath(path: string): Promise<void> {
  // One screen can resolve twice. A write that changes nothing is not worth a
  // trip to SQLite.
  if (path === lastPath) return;
  lastPath = path;
  await invoke("setting_put", {
    request: { key: "lastPath", value: path },
  }).catch(() => undefined);
}

/** Opens an address in the browser of the Mac, not in the app window. */
export const openInBrowser = (url: string) => open(url);

/**
 * How the sound is made, from the last time the Voice screen saved it. Null
 * before the user opens that screen, and in a browser.
 */
let speech = await invoke<SpeechSettings | null>("setting_get", {
  request: { key: "speech" },
}).catch(() => null);

export function currentSpeech(): SpeechSettings | null {
  return speech;
}

export async function saveSpeech(settings: SpeechSettings): Promise<void> {
  await invoke("setting_put", {
    request: { key: "speech", value: settings },
  }).catch(() => undefined);
  speech = settings;
}

/** The file that holds one sentence. Rust names it, and never sends a key. */
export const synthesizeSpeech = (text: string, settings: SpeechSettings) =>
  invoke<{ path: string; from_cache: boolean }>("speech_synthesize", {
    request: { text, settings },
  });

/** Speaks through the native process, where the process tap can hear it. */
export const speakSystem = (text: string, settings: SpeechSettings) =>
  invoke<void>("speech_system", {
    request: {
      text,
      voice_id: settings.voiceId,
      speed: settings.speed,
    },
  });

/** Plays one cached cloud-voice file through the native process. */
export const playSpeechFile = (path: string) =>
  invoke<void>("speech_file_play", { request: { path } });

/** Stops either native voice now. */
export const stopNativeSpeech = () => invoke<void>("speech_native_stop");

/** The address the WebView uses to read a file that Rust wrote. */
export const audioUrl = (path: string) => convertFileSrc(path);

/**
 * The shortcut ideas the user turned down. They never come back.
 *
 * The web app keeps these in the browser storage. The desktop app keeps them
 * in a setting, beside the rest of its state.
 */
export const dismissedIdeas =
  (await invoke<string[] | null>("setting_get", {
    request: { key: "dismissed-ideas" },
  }).catch(() => null)) ?? [];

export const rememberDismissed = (texts: string[]) =>
  invoke("setting_put", {
    request: { key: "dismissed-ideas", value: texts },
  }).catch(() => undefined);

/**
 * The mode each space was left in, by slug, and whether the right card is
 * open.
 *
 * Both are answers the user gave once. September keeps them beside the rest
 * of its state, so a new install of the WebView cannot lose them.
 */
export const spaceModes =
  (await invoke<Record<string, string> | null>("setting_get", {
    request: { key: "space-modes" },
  }).catch(() => null)) ?? {};

export const rememberModes = (modes: Record<string, string>) =>
  invoke("setting_put", {
    request: { key: "space-modes", value: modes },
  }).catch(() => undefined);

export const panelOpen =
  (await invoke<boolean | null>("setting_get", {
    request: { key: "panel-open" },
  }).catch(() => null)) ?? false;

export const rememberPanel = (open: boolean) =>
  invoke("setting_put", {
    request: { key: "panel-open", value: open },
  }).catch(() => undefined);

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
}

/** One ElevenLabs model. It decides the quality, the speed, and the languages. */
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
  apple: { supported: false, available: false, reason: null },
  openrouter: absent("openrouter"),
  elevenlabs: absent("elevenlabs"),
};

/**
 * One read for the whole step.
 *
 * ponytail: a browser without the Tauri backend keeps the blank connections,
 * so `pnpm dev` still renders the step instead of throwing.
 */
export async function readConnections(): Promise<Connections> {
  const [apple, cloud] = await Promise.all([
    invoke<AppleStatus>("apfel_status").catch(() => BLANK_CONNECTIONS.apple),
    invoke<ProviderStatus[]>("provider_status").catch(() => [] as ProviderStatus[]),
  ]);
  const find = (provider: Provider) =>
    cloud.find((status) => status.provider === provider) ?? absent(provider);

  return { apple, openrouter: find("openrouter"), elevenlabs: find("elevenlabs") };
}

/** Rust tests the key, then stores it in the Keychain. It returns a status. */
export const connectProvider = (provider: Provider, key: string) =>
  invoke<ProviderStatus>("provider_connect", { request: { provider, key } });

export const forgetProvider = (provider: Provider) =>
  invoke<boolean>("provider_forget", { request: { provider } });

export const listVoices = () => invoke<Voice[]>("provider_voices");

export const listModels = () => invoke<Model[]>("provider_models");


// ------------------------------------------------------ where sound comes out

/** One sound output of this Mac. */
export interface AudioOutput {
  /** The name that lasts across a restart and a replug. */
  uid: string;
  /** The name the user reads, for example `Mac mini Speakers`. */
  name: string;
}

/** Every output this Mac can play through. */
export const listOutputs = () => invoke<AudioOutput[]>("audio_outputs");

/** The output the Mac plays through now. */
export const currentOutput = () => invoke<string>("audio_output");

/**
 * Moves the sound of this Mac to one output.
 *
 * Both voices of September follow the Mac, so this one setting moves both.
 * The Mac remembers it, and September keeps no copy that could disagree.
 */
export const chooseOutput = (uid: string) =>
  invoke<void>("audio_output_set", { request: { uid } });

// ---------------------------------------------------- use the voice in calls

export interface VirtualMicrophoneStatus {
  active: boolean;
  name: string;
  uid: string;
}

/** Whether calling apps can select the September input now. */
export const virtualMicrophoneStatus = () =>
  invoke<VirtualMicrophoneStatus>("virtual_microphone_status");

/** Publishes September speech as one system input. */
export const startVirtualMicrophone = () =>
  invoke<VirtualMicrophoneStatus>("virtual_microphone_start");

/** Removes the system input. */
export const stopVirtualMicrophone = () =>
  invoke<VirtualMicrophoneStatus>("virtual_microphone_stop");

// ------------------------------------------------------ show text in calls

export interface VirtualCameraStatus {
  active: boolean;
  pending: boolean;
  name: string;
  uid: string;
  detail: string | null;
}

/** Whether calling apps can select September Camera now. */
export const virtualCameraStatus = () =>
  invoke<VirtualCameraStatus>("virtual_camera_status");

/** Asks macOS to activate the camera extension bundled with September. */
export const startVirtualCamera = () =>
  invoke<VirtualCameraStatus>("virtual_camera_start");

/** Asks macOS to deactivate the camera extension. */
export const stopVirtualCamera = () =>
  invoke<VirtualCameraStatus>("virtual_camera_stop");

/** Sends only text state to the extension. Camera frames stay native. */
export const updateVirtualCameraOverlay = (text: string, visible = true) =>
  invoke<void>("virtual_camera_overlay", { request: { text, visible } });
