import { useMemo } from 'react';

import { useRecordListQuery } from '@/packages/shared/lib/data';

import { CostSource } from './lib/pricing';
import {
  type AnalyticsEvent,
  AnalyticsEventSchema,
  type GenerationFeature,
  analyticsCollection,
} from './store';

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
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  tokens_by_generation_type: Record<GenerationFeature, number>;
}

export interface TTSStats extends ProviderStats {
  avg_text_length: number;
  avg_duration_seconds: number;
}

/** Usage and cost for one provider, model, or feature. */
export interface SpendBucket {
  calls: number;
  /** Calls that carried a price at all. Cloning, for one, is not metered. */
  priced_calls: number;
  cost_usd: number;
  /** Where the dollar figure came from — mixed buckets report the weakest source. */
  source: CostSource;
  input_tokens: number;
  output_tokens: number;
  characters: number;
  credits: number;
  audio_seconds: number;
}

export interface SpendStats {
  /** Measured + estimated dollars only. Quota and unpriced calls are excluded. */
  total_usd: number;
  total_calls: number;
  total_tokens: number;
  total_characters: number;
  total_credits: number;
  failed_calls: number;
  cached_calls: number;
  by_provider: Record<string, SpendBucket>;
  /** Keyed `provider:model`. */
  by_model: Record<string, SpendBucket>;
  /** Keyed by generation feature, plus `speech` and `voice_clone`. */
  by_feature: Record<string, SpendBucket>;
  /** `provider:model` pairs we have no price for — the UI says so rather than guessing. */
  unknown_price_models: string[];
}

export interface AnalyticsSummary {
  messages: MessageStats;
  ai_generations: AIGenerationStats;
  tts_generations: TTSStats;
  spend: SpendStats;
  date_range: { start_date: Date; end_date: Date };
}

// ---------------------------------------------------------------------------
// Spend aggregation
// ---------------------------------------------------------------------------

/** Weakest source wins: a bucket is only as trustworthy as its softest number. */
const SOURCE_CONFIDENCE: CostSource[] = ['unknown', 'quota', 'estimated', 'measured', 'free'];

function emptyBucket(): SpendBucket {
  return {
    calls: 0,
    priced_calls: 0,
    cost_usd: 0,
    // A bucket of nothing but unmetered calls has no price to report.
    source: 'unknown',
    input_tokens: 0,
    output_tokens: 0,
    characters: 0,
    credits: 0,
    audio_seconds: 0,
  };
}

function weakest(a: CostSource, b: CostSource): CostSource {
  return SOURCE_CONFIDENCE.indexOf(a) <= SOURCE_CONFIDENCE.indexOf(b) ? a : b;
}

interface CallUnits {
  cost_usd?: number;
  /** Absent for calls a provider does not meter, which say nothing about price. */
  source?: CostSource;
  input_tokens?: number;
  output_tokens?: number;
  characters?: number;
  credits?: number;
  audio_seconds?: number;
}

function addTo(buckets: Record<string, SpendBucket>, key: string, units: CallUnits): void {
  const bucket = (buckets[key] ??= emptyBucket());

  bucket.calls++;
  bucket.cost_usd += units.cost_usd ?? 0;

  // An unmetered call must not drag a provider's source down: one voice clone
  // should not make a whole ElevenLabs quota read as "no price".
  if (units.source) {
    bucket.source = bucket.priced_calls === 0 ? units.source : weakest(bucket.source, units.source);
    bucket.priced_calls++;
  }
  bucket.input_tokens += units.input_tokens ?? 0;
  bucket.output_tokens += units.output_tokens ?? 0;
  bucket.characters += units.characters ?? 0;
  bucket.credits += units.credits ?? 0;
  bucket.audio_seconds += units.audio_seconds ?? 0;
}

/**
 * Roll every outbound provider call up into spend.
 *
 * Only calls that carry a real dollar figure contribute to `total_usd` —
 * prepaid credits and unpriced models are counted in their own units so the UI
 * can show them honestly instead of folding them into the money.
 */
export function summarizeSpend(events: AnalyticsEvent[]): SpendStats {
  const stats: SpendStats = {
    total_usd: 0,
    total_calls: 0,
    total_tokens: 0,
    total_characters: 0,
    total_credits: 0,
    failed_calls: 0,
    cached_calls: 0,
    by_provider: {},
    by_model: {},
    by_feature: {},
    unknown_price_models: [],
  };

  const unpriced = new Set<string>();

  for (const event of events) {
    if (event.event_type === 'message_sent') continue;

    const { provider } = event.data;
    let units: CallUnits;
    let model: string;
    let feature: string;

    if (event.event_type === 'ai_generation') {
      units = {
        cost_usd: event.data.cost_usd,
        source: event.data.cost_source,
        input_tokens: event.data.input_tokens,
        output_tokens: event.data.output_tokens,
        audio_seconds: event.data.audio_seconds,
      };
      model = event.data.model;
      feature = event.data.generation_type;
      if (event.data.cached) stats.cached_calls++;
    } else if (event.event_type === 'tts_generation') {
      units = {
        cost_usd: event.data.cost_usd,
        source: event.data.cost_source,
        characters: event.data.text_length,
        credits: event.data.credits,
      };
      model = event.data.model;
      feature = 'speech';
    } else {
      // Cloning consumes a voice slot, not metered units — counted, never priced.
      units = {};
      model = 'voice-clone';
      feature = 'voice_clone';
    }

    stats.total_calls++;
    if (!event.data.success) stats.failed_calls++;
    stats.total_usd += units.cost_usd ?? 0;
    stats.total_tokens += (units.input_tokens ?? 0) + (units.output_tokens ?? 0);
    stats.total_characters += units.characters ?? 0;
    stats.total_credits += units.credits ?? 0;

    addTo(stats.by_provider, provider, units);
    addTo(stats.by_model, `${provider}:${model}`, units);
    addTo(stats.by_feature, feature, units);

    if (units.source === 'unknown') unpriced.add(`${provider}:${model}`);
  }

  stats.unknown_price_models = [...unpriced];

  return stats;
}

export interface UseAnalyticsSummaryReturn {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function summarizeAnalyticsEvents(
  allEvents: AnalyticsEvent[],
  startDate: Date,
  endDate: Date
): AnalyticsSummary {
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

  const totalInputTokens = aiEvents.reduce((s, e) => s + (e.data.input_tokens ?? 0), 0);
  const totalOutputTokens = aiEvents.reduce((s, e) => s + (e.data.output_tokens ?? 0), 0);
  const tokensByGenerationType = aiEvents.reduce(
    (acc, e) => {
      acc[e.data.generation_type] += (e.data.input_tokens ?? 0) + (e.data.output_tokens ?? 0);
      return acc;
    },
    {
      suggestions: 0,
      transcription: 0,
      summary: 0,
      extraction: 0,
      phrases: 0,
      context: 0,
    } as Record<GenerationFeature, number>
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
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      tokens_by_generation_type: tokensByGenerationType,
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
    spend: summarizeSpend(allEvents),
    date_range: { start_date: startDate, end_date: endDate },
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseEventsInRangeReturn {
  events: AnalyticsEvent[];
  startDate: Date;
  endDate: Date;
  isLoading: boolean;
  error?: { message: string };
}

/** Every stored event in a time range. Shared by the summary and the call log. */
export function useEventsInRange({
  userId,
  timeRange = 'day',
}: {
  userId?: string;
  timeRange?: TimeRange;
} = {}): UseEventsInRangeReturn {
  const { start: startDate, end: endDate } = useMemo(
    () => getTimeRangeBounds(timeRange),
    [timeRange]
  );

  const { data, isLoading, error } = useRecordListQuery(
    'analytics-events',
    analyticsCollection,
    AnalyticsEventSchema
  );
  const events = useMemo(
    () =>
      data.filter(
        event =>
          event.timestamp >= startDate &&
          event.timestamp <= endDate &&
          (!userId || event.user_id === userId)
      ),
    [data, endDate, startDate, userId]
  );

  return { events, startDate, endDate, isLoading, error };
}

export function useAnalyticsSummary({
  userId,
  timeRange = 'day',
}: {
  userId?: string;
  timeRange?: TimeRange;
} = {}): UseAnalyticsSummaryReturn {
  const { events, startDate, endDate, isLoading, error } = useEventsInRange({ userId, timeRange });

  const summary = useMemo(() => {
    if (events.length === 0) return undefined;
    return summarizeAnalyticsEvents(events, startDate, endDate);
  }, [events, startDate, endDate]);

  return { summary, isLoading, error };
}
