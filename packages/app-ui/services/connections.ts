import { platform } from "@platform/adapter";

import type { AppleStatus, Provider, ProviderStatus } from "../platform";

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

const NO_APPLE: AppleStatus = { supported: false, available: false, reason: null };

/** What a screen shows before the first read answers. */
export const BLANK_CONNECTIONS: Connections = {
  apple: NO_APPLE,
  openrouter: absent("openrouter"),
  elevenlabs: absent("elevenlabs"),
};

/** The state of every service, in one read. */
export async function readConnections(): Promise<Connections> {
  const [apple, cloud] = await Promise.all([
    platform.writing.apple?.status() ?? NO_APPLE,
    platform.providers.status(),
  ]);
  const find = (provider: Provider) =>
    cloud.find((status) => status.provider === provider) ?? absent(provider);
  return { apple, openrouter: find("openrouter"), elevenlabs: find("elevenlabs") };
}
