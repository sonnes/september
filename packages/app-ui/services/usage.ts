import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { platform } from "@platform/adapter";
import type { GenerationFeature } from "@september/core/rules/model-config";
import type { ExportKind } from "@september/core/rules/present/export";
import {
  getTimeRangeBounds,
  summarizeUsage,
  toRecentCalls,
  usageCallsToCsv,
  type CostSource,
  type TimeRange,
  type UsageEvent,
} from "@september/core/rules/usage-summary";

import { downloadBlob } from "./browser";
import { currentUserId } from "./settings";

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

let revision = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Keeps one usage event. A report never blocks the work it counts, so a
 * failed write goes to the console and the work goes on.
 */
function record(event_type: UsageEvent["event_type"], data: Record<string, unknown>): void {
  platform.store
    .putUsageEvent({
      id: crypto.randomUUID(),
      user_id: currentUserId(),
      event_type,
      timestamp: Date.now(),
      data,
    })
    .then(
      () => {
        revision += 1;
        for (const listener of listeners) listener();
      },
      (reason: unknown) => console.error("September did not record usage.", reason),
    );
}

export const recordMessageUsage = (text: string, keysTyped: number, spaceId: string) =>
  record("message_sent", {
    text_length: text.length,
    keys_typed: keysTyped,
    space_id: spaceId,
  });

export const recordAiUsage = (usage: AIUsage) => record("ai_generation", { ...usage });

export const recordTtsUsage = (usage: TtsUsage) => record("tts_generation", { ...usage });

/**
 * A story told, and a file saved. Neither one is a provider call, so neither
 * reaches the spend report. The dashboard counts them.
 */
export const recordPresentUsage = (chunks: number, spoken: boolean) =>
  record("note_present", { chunks, spoken });

export const recordExportUsage = (kind: ExportKind) => record("note_export", { kind });

export function useUsage(timeRange: TimeRange) {
  const currentRevision = useSyncExternalStore(subscribe, () => revision, () => 0);
  const { start, end } = getTimeRangeBounds(timeRange);
  const query = useQuery({
    queryKey: ["usage", currentUserId(), timeRange, currentRevision],
    queryFn: () =>
      platform.store.listUsageEvents(currentUserId(), start.getTime(), end.getTime()),
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
    queryFn: () => platform.providers.quota(),
  });
}

export function downloadUsageCsv(calls: ReturnType<typeof toRecentCalls>): void {
  downloadBlob(
    new Blob([usageCallsToCsv(calls)], { type: "text/csv;charset=utf-8" }),
    `september-usage-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
