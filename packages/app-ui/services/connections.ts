import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platform } from "@platform/adapter";

import type { AppleStatus, Provider, ProviderStatus, Voice } from "../platform";
import type { CreatedVoice } from "./cloning";

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
const BLANK_CONNECTIONS: Connections = {
  apple: NO_APPLE,
  openrouter: absent("openrouter"),
  elevenlabs: absent("elevenlabs"),
};

/** The state of every service, in one read. */
async function readConnections(): Promise<Connections> {
  const [apple, cloud] = await Promise.all([
    platform.writing.apple?.status() ?? NO_APPLE,
    platform.providers.status(),
  ]);
  const find = (provider: Provider) =>
    cloud.find((status) => status.provider === provider) ?? absent(provider);
  return { apple, openrouter: find("openrouter"), elevenlabs: find("elevenlabs") };
}

const connectionsKey = ["connections"];
const voicesKey = ["voices"];

/** What this device reports about each service, read once for every screen. */
export function useConnections() {
  const client = useQueryClient();
  const read = useQuery({ queryKey: connectionsKey, queryFn: readConnections });
  return {
    connections: read.data ?? BLANK_CONNECTIONS,
    checking: read.isPending,
    error: read.error,
    /**
     * Puts a new status of one service in place, after a key is saved or
     * forgotten. A new ElevenLabs key reads its own voices.
     */
    replace: (status: ProviderStatus) => {
      client.setQueryData<Connections>(connectionsKey, (held = BLANK_CONNECTIONS) => ({
        ...held,
        [status.provider]: status,
      }));
      if (status.provider === "elevenlabs") void client.resetQueries({ queryKey: voicesKey });
    },
  };
}

/** Forgets the key of a service, and shows the service as not connected. */
export function useForgetKey() {
  const { replace } = useConnections();
  return useMutation({
    mutationFn: async (provider: Provider) => {
      await platform.providers.forget(provider);
      return provider;
    },
    onSuccess: (provider) => replace(absent(provider)),
  });
}

/**
 * ElevenLabs lists a new voice some time after it makes it, so a held list
 * that holds a new voice is not read again for this long.
 */
const VOICES_FRESH_MS = 60_000;

const voicesQuery = {
  queryKey: voicesKey,
  queryFn: () => platform.providers.voices(),
  staleTime: VOICES_FRESH_MS,
};

/** The voices of the ElevenLabs account, read while `enabled`. */
export function useVoices(enabled: boolean) {
  return useQuery({ ...voicesQuery, enabled });
}

/**
 * Puts a voice made a moment ago into the held list, before ElevenLabs lists it.
 * It reads no voices, so a failed read cannot hide a voice that was made.
 */
export function useKeepCreatedVoice() {
  const client = useQueryClient();
  return (created: CreatedVoice) => {
    const held = client.getQueryData<Voice[]>(voicesKey) ?? [];
    if (held.some((voice) => voice.id === created.id)) return;
    client.setQueryData<Voice[]>(voicesKey, [
      { ...created, preview_url: null, category: "cloned", is_owner: true },
      ...held,
    ]);
  };
}
