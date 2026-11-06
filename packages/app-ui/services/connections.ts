import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

/** What this device reports about each service, read once for every screen. */
export function useConnections() {
  const client = useQueryClient();
  const read = useQuery({ queryKey: connectionsKey, queryFn: readConnections });
  return {
    connections: read.data ?? BLANK_CONNECTIONS,
    checking: read.isPending,
    error: read.error,
    /** Puts a new status of one service in place, after a key is saved or forgotten. */
    replace: (status: ProviderStatus) =>
      client.setQueryData<Connections>(connectionsKey, (held = BLANK_CONNECTIONS) => ({
        ...held,
        [status.provider]: status,
      })),
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

/** The voices of the ElevenLabs account, read while `enabled`. */
export function useVoices(enabled: boolean) {
  return useQuery({
    queryKey: ["voices"],
    queryFn: () => platform.providers.voices(),
    enabled,
  });
}
