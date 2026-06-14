import { useMemo } from 'react';

import { and, eq, gte, lte } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { AnalyticsEvent, analyticsCollection } from './store';

// ---------------------------------------------------------------------------
// Time range utilities
// ---------------------------------------------------------------------------

export type TimeRange = 'day' | 'week' | 'month';

export function getTimeRangeBounds(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case 'day': {
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'week': {
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Generic aggregation helper (replaces three copy-pasted blocks)
// ---------------------------------------------------------------------------

interface ProviderEvent {
  provider: string;
  latency_ms: number;
  success: boolean;
}

export interface ProviderStats {
  total: number;
  success_rate: number;
  avg_latency_ms: number;
  by_provider: Record<string, { count: number; success_count: number; avg_latency_ms: number }>;
}

export function aggregateByProvider(events: ProviderEvent[]): ProviderStats {
  if (events.length === 0) {
    return { total: 0, success_rate: 0, avg_latency_ms: 0, by_provider: {} };
  }

  const byProvider: Record<string, { count: number; success_count: number; latencies: number[] }> =
    {};

  for (const e of events) {
    if (!byProvider[e.provider]) {
      byProvider[e.provider] = { count: 0, success_count: 0, latencies: [] };
    }
    byProvider[e.provider].count++;
    if (e.success) byProvider[e.provider].success_count++;
    byProvider[e.provider].latencies.push(e.latency_ms);
  }

  const successCount = events.filter(e => e.success).length;
  const totalLatency = events.reduce((s, e) => s + e.latency_ms, 0);

  return {
    total: events.length,
    success_rate: (successCount / events.length) * 100,
    avg_latency_ms: totalLatency / events.length,
    by_provider: Object.fromEntries(
      Object.entries(byProvider).map(([provider, stats]) => [
        provider,
        {
          count: stats.count,
          success_count: stats.success_count,
          avg_latency_ms: stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length,
        },
      ])
    ),
  };
}

// ---------------------------------------------------------------------------
// Summary types
// ---------------------------------------------------------------------------

export interface MessageStats {
  total_messages: number;
  total_keys_typed: number;
  total_text_length: number;
  efficiency: number;
}

export interface AIGenerationStats extends ProviderStats {
  avg_input_length: number;
  avg_output_length: number;
}

export interface TTSStats extends ProviderStats {
  avg_text_length: number;
  avg_duration_seconds: number;
}

export interface AnalyticsSummary {
  messages: MessageStats;
  ai_generations: AIGenerationStats;
  tts_generations: TTSStats;
  date_range: { start_date: Date; end_date: Date };
}

export interface UseAnalyticsSummaryReturn {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalyticsSummary({
  userId,
  timeRange = 'day',
}: {
  userId?: string;
  timeRange?: TimeRange;
} = {}): UseAnalyticsSummaryReturn {
  const { start: startDate, end: endDate } = useMemo(
    () => getTimeRangeBounds(timeRange),
    [timeRange]
  );

  const { data: events, isLoading, isError, status } = useLiveQuery(
    q => {
      let query = q.from({ items: analyticsCollection });
      query = query.where(({ items }) =>
        and(
          gte(items.timestamp, startDate),
          lte(items.timestamp, endDate),
          userId ? eq(items.user_id, userId) : undefined
        )
      ) as typeof query;
      return query;
    },
    [userId, startDate, endDate]
  );

  const summary = useMemo(() => {
    if (!events || events.length === 0) return undefined;

    const allEvents = events as AnalyticsEvent[];

    const messageSentEvents = allEvents.filter(e => e.event_type === 'message_sent') as Extract<
      AnalyticsEvent,
      { event_type: 'message_sent' }
    >[];

    const totalTextLength = messageSentEvents.reduce((s, e) => s + e.data.text_length, 0);
    const totalKeysTyped = messageSentEvents.reduce((s, e) => s + e.data.keys_typed, 0);

    const aiEvents = allEvents.filter(e => e.event_type === 'ai_generation') as Extract<
      AnalyticsEvent,
      { event_type: 'ai_generation' }
    >[];

    const ttsEvents = allEvents.filter(e => e.event_type === 'tts_generation') as Extract<
      AnalyticsEvent,
      { event_type: 'tts_generation' }
    >[];

    const aiStats = aggregateByProvider(
      aiEvents.map(e => ({
        provider: e.data.provider,
        latency_ms: e.data.latency_ms,
        success: e.data.success,
      }))
    );

    const ttsStats = aggregateByProvider(
      ttsEvents.map(e => ({
        provider: e.data.provider,
        latency_ms: e.data.latency_ms,
        success: e.data.success,
      }))
    );

    return {
      messages: {
        total_messages: messageSentEvents.length,
        total_keys_typed: totalKeysTyped,
        total_text_length: totalTextLength,
        efficiency:
          totalTextLength > 0 ? ((totalTextLength - totalKeysTyped) / totalTextLength) * 100 : 0,
      },
      ai_generations: {
        ...aiStats,
        avg_input_length:
          aiEvents.length > 0
            ? aiEvents.reduce((s, e) => s + e.data.input_length, 0) / aiEvents.length
            : 0,
        avg_output_length:
          aiEvents.length > 0
            ? aiEvents.reduce((s, e) => s + e.data.output_length, 0) / aiEvents.length
            : 0,
      },
      tts_generations: {
        ...ttsStats,
        avg_text_length:
          ttsEvents.length > 0
            ? ttsEvents.reduce((s, e) => s + e.data.text_length, 0) / ttsEvents.length
            : 0,
        avg_duration_seconds:
          ttsEvents.length > 0
            ? ttsEvents.reduce((s, e) => s + e.data.duration_seconds, 0) / ttsEvents.length
            : 0,
      },
      date_range: { start_date: startDate, end_date: endDate },
    };
  }, [events, startDate, endDate]);

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return { summary, isLoading, error };
}
