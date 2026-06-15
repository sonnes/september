import { describe, expect, it } from 'vitest';

import { aggregateByProvider, summarizeAnalyticsEvents } from './use-summary';

describe('aggregateByProvider()', () => {
  it('returns empty stats for empty input', () => {
    const result = aggregateByProvider([]);
    expect(result.total).toBe(0);
    expect(result.success_rate).toBe(0);
    expect(result.avg_latency_ms).toBe(0);
    expect(result.by_provider).toEqual({});
  });

  it('counts total events', () => {
    const events = [
      { provider: 'gemini', latency_ms: 100, success: true },
      { provider: 'gemini', latency_ms: 200, success: false },
    ];
    const result = aggregateByProvider(events);
    expect(result.total).toBe(2);
  });

  it('computes success rate as percentage', () => {
    const events = [
      { provider: 'gemini', latency_ms: 100, success: true },
      { provider: 'gemini', latency_ms: 200, success: false },
      { provider: 'gemini', latency_ms: 300, success: true },
      { provider: 'gemini', latency_ms: 400, success: true },
    ];
    const result = aggregateByProvider(events);
    expect(result.success_rate).toBeCloseTo(75, 5);
  });

  it('computes avg_latency_ms across all events', () => {
    const events = [
      { provider: 'a', latency_ms: 100, success: true },
      { provider: 'b', latency_ms: 300, success: true },
    ];
    const result = aggregateByProvider(events);
    expect(result.avg_latency_ms).toBe(200);
  });

  it('groups by provider with per-provider stats', () => {
    const events = [
      { provider: 'gemini', latency_ms: 100, success: true },
      { provider: 'gemini', latency_ms: 200, success: false },
      { provider: 'webllm', latency_ms: 400, success: true },
    ];
    const result = aggregateByProvider(events);
    expect(result.by_provider['gemini'].count).toBe(2);
    expect(result.by_provider['gemini'].success_count).toBe(1);
    expect(result.by_provider['gemini'].avg_latency_ms).toBe(150);
    expect(result.by_provider['webllm'].count).toBe(1);
    expect(result.by_provider['webllm'].success_count).toBe(1);
    expect(result.by_provider['webllm'].avg_latency_ms).toBe(400);
  });

  it('handles single event correctly', () => {
    const events = [{ provider: 'elevenlabs', latency_ms: 500, success: false }];
    const result = aggregateByProvider(events);
    expect(result.total).toBe(1);
    expect(result.success_rate).toBe(0);
    expect(result.avg_latency_ms).toBe(500);
    expect(result.by_provider['elevenlabs'].count).toBe(1);
    expect(result.by_provider['elevenlabs'].success_count).toBe(0);
  });
});

describe('summarizeAnalyticsEvents()', () => {
  it('totals AI input and output tokens separately from message efficiency', () => {
    const start = new Date('2026-06-15T00:00:00.000Z');
    const end = new Date('2026-06-15T23:59:59.999Z');
    const events = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        user_id: 'user-1',
        event_type: 'message_sent',
        timestamp: start,
        data: { text_length: 100, keys_typed: 25 },
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        user_id: 'user-1',
        event_type: 'ai_generation',
        timestamp: start,
        data: {
          generation_type: 'suggestions',
          provider: 'openrouter',
          model: 'model-a',
          input_length: 1000,
          output_length: 2000,
          input_tokens: 12,
          output_tokens: 34,
          latency_ms: 300,
          success: true,
        },
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        user_id: 'user-1',
        event_type: 'ai_generation',
        timestamp: start,
        data: {
          generation_type: 'summary',
          provider: 'webllm',
          model: 'model-b',
          input_length: 250,
          output_length: 125,
          input_tokens: 5,
          output_tokens: 7,
          latency_ms: 500,
          success: true,
        },
      },
    ] as Parameters<typeof summarizeAnalyticsEvents>[0];

    const result = summarizeAnalyticsEvents(events, start, end);

    expect(result.messages.efficiency).toBe(75);
    expect(result.ai_generations.total_input_tokens).toBe(17);
    expect(result.ai_generations.total_output_tokens).toBe(41);
    expect(result.ai_generations.total_tokens).toBe(58);
    expect(result.ai_generations.tokens_by_generation_type.suggestions).toBe(46);
    expect(result.ai_generations.tokens_by_generation_type.summary).toBe(12);
  });
});
