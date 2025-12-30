import { useMemo } from 'react';

import { and, gte, lte, eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { analyticsCollection } from '../db';
import { AnalyticsEvent, MessageSentEvent, AIGenerationEvent, TTSGenerationEvent } from '../types';
import { getTimeRangeBounds, TimeRange } from '../lib/utils';

/**
 * Summary statistics for messages
 */
export interface MessageStats {
  total_messages: number;
  avg_text_length: number;
  messages_with_voice: number;
  messages_with_autocomplete: number;
  autocomplete_adoption_rate: number;
}

/**
 * Summary statistics for AI generations grouped by provider
 */
export interface AIGenerationStats {
  total_generations: number;
  success_rate: number;
  avg_input_length: number;
  avg_output_length: number;
  avg_latency_ms: number;
  by_provider: Record<
    string,
    {
      count: number;
      success_count: number;
      avg_latency_ms: number;
    }
  >;
}

/**
 * Summary statistics for TTS generations grouped by provider
 */
export interface TTSStats {
  total_generations: number;
  success_rate: number;
  avg_text_length: number;
  avg_duration_seconds: number;
  avg_latency_ms: number;
  by_provider: Record<
    string,
    {
      count: number;
      success_count: number;
      avg_latency_ms: number;
    }
  >;
}

/**
 * Complete analytics summary with all metrics
 */
export interface AnalyticsSummary {
  messages: MessageStats;
  ai_generations: AIGenerationStats;
  tts_generations: TTSStats;
  unique_users: number;
  date_range: {
    start_date: Date;
    end_date: Date;
  };
}

/**
 * Return type for the useAnalyticsSummary hook
 */
export interface UseAnalyticsSummaryReturn {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
  error?: { message: string };
}

/**
 * Hook to fetch and aggregate analytics data
 * Uses TanStack DB live queries for real-time updates
 *
 * @param userId - Optional user ID to filter events (if not provided, aggregates all users)
 * @param timeRange - Time range for aggregation ('day', 'week', or 'month')
 * @returns Object containing aggregated analytics summary
 */
export function useAnalyticsSummary({
  userId,
  timeRange = 'day',
}: {
  userId?: string;
  timeRange?: TimeRange;
} = {}): UseAnalyticsSummaryReturn {
  const { start: startDate, end: endDate } = getTimeRangeBounds(timeRange);

  const {
    data: events,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: analyticsCollection });

      // Filter by date range
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
    if (!events || events.length === 0) {
      return undefined;
    }

    const allEvents = events as AnalyticsEvent[];
    const uniqueUsers = new Set(allEvents.map(e => e.user_id)).size;

    // Aggregate message stats
    const messageSentEvents = allEvents.filter(
      (e): e is MessageSentEvent => e.event_type === 'message_sent'
    );
    const messageStats: MessageStats = {
      total_messages: messageSentEvents.length,
      avg_text_length:
        messageSentEvents.length > 0
          ? messageSentEvents.reduce((sum, e) => sum + e.data.text_length, 0) /
            messageSentEvents.length
          : 0,
      messages_with_voice: messageSentEvents.filter(e => e.data.has_voice_input).length,
      messages_with_autocomplete: messageSentEvents.filter(e => e.data.used_autocomplete)
        .length,
      autocomplete_adoption_rate:
        messageSentEvents.length > 0
          ? (messageSentEvents.filter(e => e.data.used_autocomplete).length /
              messageSentEvents.length) *
            100
          : 0,
    };

    // Aggregate AI generation stats
    const aiGenerationEvents = allEvents.filter(
      (e): e is AIGenerationEvent => e.event_type === 'ai_generation'
    );
    const aiSuccessCount = aiGenerationEvents.filter(e => e.data.success).length;
    const aiByProvider: Record<string, { count: number; success_count: number; latencies: number[] }> = {};

    for (const event of aiGenerationEvents) {
      const provider = event.data.provider;
      if (!aiByProvider[provider]) {
        aiByProvider[provider] = {
          count: 0,
          success_count: 0,
          latencies: [],
        };
      }
      aiByProvider[provider].count++;
      if (event.data.success) {
        aiByProvider[provider].success_count++;
      }
      aiByProvider[provider].latencies.push(event.data.latency_ms);
    }

    const aiGenerationStats: AIGenerationStats = {
      total_generations: aiGenerationEvents.length,
      success_rate:
        aiGenerationEvents.length > 0 ? (aiSuccessCount / aiGenerationEvents.length) * 100 : 0,
      avg_input_length:
        aiGenerationEvents.length > 0
          ? aiGenerationEvents.reduce((sum, e) => sum + e.data.input_length, 0) /
            aiGenerationEvents.length
          : 0,
      avg_output_length:
        aiGenerationEvents.length > 0
          ? aiGenerationEvents.reduce((sum, e) => sum + e.data.output_length, 0) /
            aiGenerationEvents.length
          : 0,
      avg_latency_ms:
        aiGenerationEvents.length > 0
          ? aiGenerationEvents.reduce((sum, e) => sum + e.data.latency_ms, 0) /
            aiGenerationEvents.length
          : 0,
      by_provider: Object.fromEntries(
        Object.entries(aiByProvider).map(([provider, stats]) => [
          provider,
          {
            count: stats.count,
            success_count: stats.success_count,
            avg_latency_ms:
              stats.latencies.length > 0
                ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
                : 0,
          },
        ])
      ),
    };

    // Aggregate TTS generation stats
    const ttsGenerationEvents = allEvents.filter(
      (e): e is TTSGenerationEvent => e.event_type === 'tts_generation'
    );
    const ttsSuccessCount = ttsGenerationEvents.filter(e => e.data.success).length;
    const ttsByProvider: Record<string, { count: number; success_count: number; latencies: number[] }> = {};

    for (const event of ttsGenerationEvents) {
      const provider = event.data.provider;
      if (!ttsByProvider[provider]) {
        ttsByProvider[provider] = {
          count: 0,
          success_count: 0,
          latencies: [],
        };
      }
      ttsByProvider[provider].count++;
      if (event.data.success) {
        ttsByProvider[provider].success_count++;
      }
      ttsByProvider[provider].latencies.push(event.data.latency_ms);
    }

    const ttsGenerationStats: TTSStats = {
      total_generations: ttsGenerationEvents.length,
      success_rate:
        ttsGenerationEvents.length > 0 ? (ttsSuccessCount / ttsGenerationEvents.length) * 100 : 0,
      avg_text_length:
        ttsGenerationEvents.length > 0
          ? ttsGenerationEvents.reduce((sum, e) => sum + e.data.text_length, 0) /
            ttsGenerationEvents.length
          : 0,
      avg_duration_seconds:
        ttsGenerationEvents.length > 0
          ? ttsGenerationEvents.reduce((sum, e) => sum + e.data.duration_seconds, 0) /
            ttsGenerationEvents.length
          : 0,
      avg_latency_ms:
        ttsGenerationEvents.length > 0
          ? ttsGenerationEvents.reduce((sum, e) => sum + e.data.latency_ms, 0) /
            ttsGenerationEvents.length
          : 0,
      by_provider: Object.fromEntries(
        Object.entries(ttsByProvider).map(([provider, stats]) => [
          provider,
          {
            count: stats.count,
            success_count: stats.success_count,
            avg_latency_ms:
              stats.latencies.length > 0
                ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
                : 0,
          },
        ])
      ),
    };

    return {
      messages: messageStats,
      ai_generations: aiGenerationStats,
      tts_generations: ttsGenerationStats,
      unique_users: uniqueUsers,
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
    };
  }, [events, startDate, endDate]);

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    summary,
    isLoading,
    error,
  };
}
