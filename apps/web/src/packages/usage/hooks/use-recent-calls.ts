'use client';

import { useMemo } from 'react';

import { CostSource } from '../lib/pricing';
import { AnalyticsEvent } from '../store';
import { TimeRange, useEventsInRange } from '../use-summary';

/** One outbound provider call, flattened for a table row. */
export interface RecentCall {
  id: string;
  timestamp: Date;
  /** Generation feature, or `speech` / `voice_clone`. */
  feature: string;
  provider: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  characters?: number;
  credits?: number;
  audio_seconds?: number;
  latency_ms: number;
  success: boolean;
  cached: boolean;
  cost_usd?: number;
  cost_source: CostSource;
  error_message?: string;
}

/** Flatten a stored event into a row. Message events are not provider calls. */
export function toRecentCall(event: AnalyticsEvent): RecentCall | undefined {
  const common = {
    id: event.id,
    timestamp: event.timestamp,
    latency_ms: 0,
    success: true,
    cached: false,
    cost_source: 'unknown' as CostSource,
  };

  switch (event.event_type) {
    case 'ai_generation':
      return {
        ...common,
        feature: event.data.generation_type,
        provider: event.data.provider,
        model: event.data.model,
        input_tokens: event.data.input_tokens,
        output_tokens: event.data.output_tokens,
        audio_seconds: event.data.audio_seconds,
        latency_ms: event.data.latency_ms,
        success: event.data.success,
        cached: event.data.cached,
        cost_usd: event.data.cost_usd,
        cost_source: event.data.cost_source,
        error_message: event.data.error_message,
      };

    case 'tts_generation':
      return {
        ...common,
        feature: 'speech',
        provider: event.data.provider,
        model: event.data.model,
        characters: event.data.text_length,
        credits: event.data.credits,
        latency_ms: event.data.latency_ms,
        success: event.data.success,
        cost_usd: event.data.cost_usd,
        cost_source: event.data.cost_source,
        error_message: event.data.error_message,
      };

    case 'voice_clone':
      return {
        ...common,
        feature: 'voice_clone',
        provider: event.data.provider,
        model: event.data.clone_kind,
        latency_ms: event.data.latency_ms,
        success: event.data.success,
        error_message: event.data.error_message,
      };

    default:
      return undefined;
  }
}

export interface UseRecentCallsReturn {
  data: RecentCall[];
  isLoading: boolean;
  error?: { message: string };
}

/** The most recent provider calls in a range, newest first. */
export function useRecentCalls({
  userId,
  timeRange = 'month',
  limit = 50,
}: {
  userId?: string;
  timeRange?: TimeRange;
  limit?: number;
} = {}): UseRecentCallsReturn {
  const { events, isLoading, error } = useEventsInRange({ userId, timeRange });

  const data = useMemo(() => {
    const calls = events
      .map(toRecentCall)
      .filter((call): call is RecentCall => call !== undefined);

    calls.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return calls.slice(0, limit);
  }, [events, limit]);

  return { data, isLoading, error };
}
