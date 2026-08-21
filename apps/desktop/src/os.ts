import { invoke } from "@tauri-apps/api/core";

import type { OnboardingDraft } from "./onboarding";

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

/** The chosen services outlive the draft, which onboarding keeps in memory. */
export const saveServices = (value: {
  writing: string;
  voice: string;
  voiceId: string | null;
}) =>
  invoke("setting_put", { request: { key: "services", value } }).catch(
    () => undefined,
  );
