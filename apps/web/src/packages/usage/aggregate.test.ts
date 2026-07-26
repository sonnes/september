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

// ---------------------------------------------------------------------------
// Spend
// ---------------------------------------------------------------------------

const START = new Date('2026-07-15T00:00:00.000Z');
const END = new Date('2026-07-15T23:59:59.999Z');

let nextId = 1;

function ai(data: Record<string, unknown>) {
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
    user_id: 'user-1',
    event_type: 'ai_generation',
    timestamp: START,
    data: {
      generation_type: 'suggestions',
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      input_length: 0,
      output_length: 0,
      latency_ms: 100,
      success: true,
      cached: false,
      cost_source: 'unknown',
      ...data,
    },
  };
}

function tts(data: Record<string, unknown>) {
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
    user_id: 'user-1',
    event_type: 'tts_generation',
    timestamp: START,
    data: {
      provider: 'elevenlabs',
      model: 'eleven_flash_v2_5',
      text_length: 0,
      duration_seconds: 0,
      latency_ms: 100,
      success: true,
      cost_source: 'unknown',
      ...data,
    },
  };
}

function summarize(events: unknown[]) {
  return summarizeAnalyticsEvents(
    events as Parameters<typeof summarizeAnalyticsEvents>[0],
    START,
    END
  );
}

describe('summarizeAnalyticsEvents() — spend', () => {
  it('totals only the calls that carry a real dollar price', () => {
    const { spend } = summarize([
      ai({ cost_usd: 0.09, cost_source: 'estimated', input_tokens: 1000, output_tokens: 100 }),
      ai({ cost_usd: 0.08, cost_source: 'measured', provider: 'openrouter', model: 'claude' }),
      // Quota and unknown have no dollar figure and must not be invented as 0.
      tts({ cost_source: 'quota', credits: 48, text_length: 96 }),
      ai({ cost_source: 'unknown', model: 'mystery-model', input_tokens: 500 }),
    ]);

    expect(spend.total_usd).toBeCloseTo(0.17, 10);
  });

  it('groups spend and usage by provider', () => {
    const { spend } = summarize([
      ai({ cost_usd: 0.05, cost_source: 'estimated', input_tokens: 1000, output_tokens: 200 }),
      ai({ cost_usd: 0.04, cost_source: 'estimated', input_tokens: 500, output_tokens: 100 }),
      tts({ cost_source: 'quota', credits: 48, text_length: 96 }),
      tts({ cost_source: 'free', cost_usd: 0, provider: 'kokoro', model: 'kokoro-82m-v1.0', text_length: 74 }),
    ]);

    expect(spend.by_provider.gemini).toMatchObject({
      calls: 2,
      cost_usd: 0.09,
      input_tokens: 1500,
      output_tokens: 300,
    });
    expect(spend.by_provider.elevenlabs).toMatchObject({ calls: 1, credits: 48, characters: 96 });
    expect(spend.by_provider.kokoro).toMatchObject({ calls: 1, characters: 74, cost_usd: 0 });
  });

  it('groups by model so a table can show one row per service', () => {
    const { spend } = summarize([
      ai({ cost_usd: 0.01, cost_source: 'estimated' }),
      ai({ cost_usd: 0.02, cost_source: 'estimated', model: 'gemini-2.5-flash' }),
    ]);

    expect(Object.keys(spend.by_model).sort()).toEqual([
      'gemini:gemini-2.5-flash',
      'gemini:gemini-2.5-flash-lite',
    ]);
    expect(spend.by_model['gemini:gemini-2.5-flash'].cost_usd).toBeCloseTo(0.02, 10);
  });

  it('groups spend by what it was for', () => {
    const { spend } = summarize([
      ai({ cost_usd: 0.02, cost_source: 'estimated', generation_type: 'suggestions' }),
      ai({ cost_usd: 0.03, cost_source: 'estimated', generation_type: 'extraction' }),
      tts({ cost_source: 'quota', credits: 20, text_length: 40 }),
    ]);

    expect(spend.by_feature.suggestions).toMatchObject({ calls: 1, cost_usd: 0.02 });
    expect(spend.by_feature.extraction).toMatchObject({ calls: 1, cost_usd: 0.03 });
    expect(spend.by_feature.speech).toMatchObject({ calls: 1 });
  });

  it('counts failures, cache hits and clones', () => {
    const { spend } = summarize([
      ai({ success: false, error_message: 'Rate limited' }),
      ai({ cached: true, cost_usd: 0, cost_source: 'free' }),
      ai({ cached: true, cost_usd: 0, cost_source: 'free' }),
      {
        id: '00000000-0000-4000-8000-000000009001',
        user_id: 'user-1',
        event_type: 'voice_clone',
        timestamp: START,
        data: {
          provider: 'elevenlabs',
          clone_kind: 'clone',
          sample_count: 3,
          latency_ms: 5400,
          success: true,
        },
      },
    ]);

    expect(spend.failed_calls).toBe(1);
    expect(spend.cached_calls).toBe(2);
    expect(spend.total_calls).toBe(4);
    expect(spend.by_provider.elevenlabs.calls).toBe(1);
  });

  it('does not let an unpriced clone drag its provider off quota', () => {
    const { spend } = summarize([
      tts({ cost_source: 'quota', credits: 48, text_length: 96 }),
      {
        id: '00000000-0000-4000-8000-000000009003',
        user_id: 'user-1',
        event_type: 'voice_clone',
        timestamp: START,
        data: {
          provider: 'elevenlabs',
          clone_kind: 'clone',
          sample_count: 3,
          latency_ms: 5400,
          success: true,
        },
      },
    ]);

    // Cloning is not metered, so it counts as a call but says nothing about price.
    expect(spend.by_provider.elevenlabs.calls).toBe(2);
    expect(spend.by_provider.elevenlabs.source).toBe('quota');
    expect(spend.by_provider.elevenlabs.priced_calls).toBe(1);
    expect(spend.by_model['elevenlabs:voice-clone'].source).toBe('unknown');
    expect(spend.unknown_price_models).toEqual([]);
  });

  it('names the models it has no price for, so the UI can say so', () => {
    const { spend } = summarize([
      ai({ cost_source: 'unknown', provider: 'openrouter', model: 'qwen/qwen3-next-80b' }),
      ai({ cost_source: 'unknown', provider: 'openrouter', model: 'qwen/qwen3-next-80b' }),
      ai({ cost_usd: 0.01, cost_source: 'estimated' }),
    ]);

    expect(spend.unknown_price_models).toEqual(['openrouter:qwen/qwen3-next-80b']);
  });

  it('returns a zeroed spend rather than nothing when there are no calls', () => {
    const { spend } = summarize([
      {
        id: '00000000-0000-4000-8000-000000009002',
        user_id: 'user-1',
        event_type: 'message_sent',
        timestamp: START,
        data: { text_length: 10, keys_typed: 2 },
      },
    ]);

    expect(spend.total_usd).toBe(0);
    expect(spend.total_calls).toBe(0);
    expect(spend.by_provider).toEqual({});
    expect(spend.unknown_price_models).toEqual([]);
  });
});
