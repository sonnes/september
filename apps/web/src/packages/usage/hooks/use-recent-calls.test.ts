import { describe, expect, it } from 'vitest';

import type { AnalyticsEvent } from '../store';
import { toRecentCall } from './use-recent-calls';

const base = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: 'user-1',
  timestamp: new Date('2026-07-26T14:32:07.000Z'),
};

describe('toRecentCall', () => {
  it('flattens a language-model call', () => {
    const call = toRecentCall({
      ...base,
      event_type: 'ai_generation',
      data: {
        generation_type: 'suggestions',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        input_length: 120,
        output_length: 40,
        input_tokens: 412,
        output_tokens: 38,
        cached: false,
        latency_ms: 410,
        success: true,
        cost_usd: 0.00006,
        cost_source: 'estimated',
      },
    } as AnalyticsEvent);

    expect(call).toMatchObject({
      id: base.id,
      feature: 'suggestions',
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      input_tokens: 412,
      output_tokens: 38,
      latency_ms: 410,
      success: true,
      cached: false,
      cost_usd: 0.00006,
      cost_source: 'estimated',
    });
  });

  it('labels a speech call and carries its characters and credits', () => {
    const call = toRecentCall({
      ...base,
      event_type: 'tts_generation',
      data: {
        provider: 'elevenlabs',
        model: 'eleven_flash_v2_5',
        text_length: 96,
        credits: 48,
        duration_seconds: 0,
        latency_ms: 280,
        success: true,
        cost_source: 'quota',
      },
    } as AnalyticsEvent);

    expect(call).toMatchObject({
      feature: 'speech',
      characters: 96,
      credits: 48,
      cost_source: 'quota',
    });
    expect(call?.cost_usd).toBeUndefined();
  });

  it('labels a voice clone and keeps its failure reason', () => {
    const call = toRecentCall({
      ...base,
      event_type: 'voice_clone',
      data: {
        provider: 'elevenlabs',
        clone_kind: 'similar',
        sample_count: 2,
        latency_ms: 1200,
        success: false,
        error_message: 'Invalid API key',
      },
    } as AnalyticsEvent);

    expect(call).toMatchObject({
      feature: 'voice_clone',
      model: 'similar',
      success: false,
      error_message: 'Invalid API key',
      cost_source: 'unknown',
    });
  });

  it('drops message events, which are not provider calls', () => {
    const call = toRecentCall({
      ...base,
      event_type: 'message_sent',
      data: { text_length: 20, keys_typed: 4 },
    } as AnalyticsEvent);

    expect(call).toBeUndefined();
  });
});
