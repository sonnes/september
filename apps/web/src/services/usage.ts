import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { listUsageEvents, putUsageEvent } from "@/services/data";
import { currentUserId, providerKey } from "@/services/os";
import type { ExportKind } from "@/rules/present";
import {
  getTimeRangeBounds,
  summarizeUsage,
  toRecentCalls,
  usageCallsToCsv,
  type CostSource,
  type TimeRange,
  type UsageEvent,
} from "@/rules/usage-summary";

export type GenerationFeature = "suggestions" | "phrases" | "context" | "agent";

export interface AIUsage {
  generation_type: GenerationFeature;
  provider: "apple" | "openrouter";
  model: string;
  input_length: number;
  output_length: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  success: boolean;
  cached: boolean;
  cost_usd?: number;
  cost_source: CostSource;
  error_message?: string;
}

export interface TtsUsage {
  provider: "system" | "elevenlabs";
  model: string;
  voice_id?: string;
  text_length: number;
  credits?: number;
  duration_seconds: number;
  latency_ms: number;
  success: boolean;
  cached: boolean;
  cost_usd?: number;
  cost_source: CostSource;
  error_message?: string;
}

export interface ElevenLabsQuota {
  tier: string | null;
  character_count: number;
  character_limit: number;
  /** Unix seconds, as returned by ElevenLabs. */
  resets_at: number | null;
}

let revision = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const announce = () => {
  revision += 1;
  for (const listener of listeners) listener();
};

async function record(event_type: UsageEvent["event_type"], data: Record<string, unknown>) {
  const event: UsageEvent = {
    id: crypto.randomUUID(),
    user_id: currentUserId(),
    event_type,
    timestamp: Date.now(),
    data,
  };
  await putUsageEvent(event);
  announce();
}

/** Records after a message is safely in IndexedDB. Reporting never blocks Talk. */
export const recordMessageUsage = (text: string, keysTyped: number, spaceId: string) =>
  record("message_sent", {
    text_length: text.length,
    keys_typed: keysTyped,
    space_id: spaceId,
  }).catch(() => undefined);

export const recordAiUsage = (usage: AIUsage) =>
  record("ai_generation", { ...usage }).catch(() => undefined);

export const recordTtsUsage = (usage: TtsUsage) =>
  record("tts_generation", { ...usage }).catch(() => undefined);

/**
 * A story told, and a file saved.
 *
 * Neither one is a provider call, so neither reaches the spend report. They
 * are here because the dashboard counts what September was used for.
 */
export const recordPresentUsage = (chunks: number, spoken: boolean) =>
  record("note_present", { chunks, spoken }).catch(() => undefined);

export const recordExportUsage = (kind: ExportKind) =>
  record("note_export", { kind }).catch(() => undefined);

export function useUsage(timeRange: TimeRange) {
  const currentRevision = useSyncExternalStore(
    subscribe,
    () => revision,
    () => 0,
  );
  const { start, end } = getTimeRangeBounds(timeRange);
  const query = useQuery({
    queryKey: ["usage", currentUserId(), timeRange, currentRevision],
    queryFn: () =>
      listUsageEvents(currentUserId(), start.getTime(), end.getTime()),
  });
  const events = query.data ?? [];
  return {
    ...query,
    events,
    summary: summarizeUsage(events),
    calls: toRecentCalls(events),
    start,
    end,
  };
}

export function useElevenLabsQuota() {
  return useQuery({
    queryKey: ["usage", "elevenlabs-quota"],
    queryFn: async () => {
      const key = providerKey("elevenlabs");
      if (!key) return null;
      const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": key },
      });
      if (!response.ok) return null;
      const row = (await response.json()) as {
        tier?: string;
        character_count?: number;
        character_limit?: number;
        next_character_count_reset_unix?: number;
      };
      return {
        tier: row.tier ?? null,
        character_count: row.character_count ?? 0,
        character_limit: row.character_limit ?? 0,
        resets_at: row.next_character_count_reset_unix ?? null,
      };
    },
  });
}

/** Uses a browser download. No provider data goes to the September server. */
export function downloadUsageCsv(calls: ReturnType<typeof toRecentCalls>): void {
  const url = URL.createObjectURL(
    new Blob([usageCallsToCsv(calls)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `september-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
