import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInsert } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  return { mockInsert };
});

// insert() returns a Transaction with isPersisted.promise; simulate that shape
function makeTx(promise: Promise<unknown>) {
  return { isPersisted: { promise } };
}

vi.mock('@tanstack/react-db', () => ({
  createCollection: vi.fn(() => ({
    createIndex: vi.fn(),
    insert: (data: unknown) => makeTx(mockInsert(data)),
  })),
}));

vi.mock('@/packages/shared/lib/indexeddb', () => ({
  indexedDBCollectionOptionsV2: vi.fn(config => config),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import { AnalyticsEventSchema, recordApiCall, track } from './store';
import type { TrackedEvent } from './store';

describe('track()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue(undefined);
  });

  describe('message_sent', () => {
    it('inserts a stored event with correct shape', async () => {
      const event: TrackedEvent = {
        type: 'message_sent',
        text_length: 42,
        space_id: 'space-abc',
        keys_typed: 10,
      };

      track('user-1', event);

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.id).toBe('test-uuid-1234');
      expect(inserted.user_id).toBe('user-1');
      expect(inserted.event_type).toBe('message_sent');
      expect(inserted.timestamp).toBeInstanceOf(Date);
      expect(inserted.data.text_length).toBe(42);
      expect(inserted.data.space_id).toBe('space-abc');
      expect(inserted.data.keys_typed).toBe(10);
    });

    it('defaults keys_typed to 0 when not provided', async () => {
      track('user-1', { type: 'message_sent', text_length: 5 });

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.data.keys_typed).toBe(0);
    });
  });

  describe('ai_generation', () => {
    it('inserts a stored event with correct shape', async () => {
      const event: TrackedEvent = {
        type: 'ai_generation',
        generation_type: 'summary',
        provider: 'my-provider',
        model: 'my-model',
        input_length: 100,
        output_length: 200,
        input_tokens: 12,
        output_tokens: 34,
        latency_ms: 350,
        success: true,
      };

      track('user-1', event);

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.event_type).toBe('ai_generation');
      expect(inserted.data.generation_type).toBe('summary');
      expect(inserted.data.provider).toBe('my-provider');
      expect(inserted.data.model).toBe('my-model');
      expect(inserted.data.input_length).toBe(100);
      expect(inserted.data.output_length).toBe(200);
      expect(inserted.data.input_tokens).toBe(12);
      expect(inserted.data.output_tokens).toBe(34);
      expect(inserted.data.latency_ms).toBe(350);
      expect(inserted.data.success).toBe(true);
    });

    it('applies defaults for generation_type, provider, model', async () => {
      track('user-1', {
        type: 'ai_generation',
        input_length: 10,
        output_length: 20,
        latency_ms: 100,
        success: false,
      });

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.data.generation_type).toBe('suggestions');
      expect(inserted.data.provider).toBe('gemini');
      expect(inserted.data.model).toBe('gemini-2.5-flash-lite');
    });
  });

  describe('tts_generation', () => {
    it('inserts a stored event with correct shape', async () => {
      const event: TrackedEvent = {
        type: 'tts_generation',
        provider: 'custom-tts',
        voice_id: 'voice-xyz',
        text_length: 80,
        duration_seconds: 4.2,
        latency_ms: 600,
        success: true,
      };

      track('user-1', event);

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.event_type).toBe('tts_generation');
      expect(inserted.data.provider).toBe('custom-tts');
      expect(inserted.data.voice_id).toBe('voice-xyz');
      expect(inserted.data.text_length).toBe(80);
      expect(inserted.data.duration_seconds).toBe(4.2);
      expect(inserted.data.latency_ms).toBe(600);
      expect(inserted.data.success).toBe(true);
    });

    it('defaults provider to elevenlabs when not provided', async () => {
      track('user-1', {
        type: 'tts_generation',
        text_length: 30,
        duration_seconds: 1.5,
        latency_ms: 200,
        success: true,
      });

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.data.provider).toBe('elevenlabs');
    });
  });

  describe('error handling', () => {
    it('does not throw when insert rejects', async () => {
      mockInsert.mockRejectedValue(new Error('IndexedDB error'));

      expect(() => {
        track('user-1', { type: 'message_sent', text_length: 10 });
      }).not.toThrow();

      // Wait a tick for the promise to settle
      await new Promise(r => setTimeout(r, 0));
    });
  });
});

describe('recordApiCall()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue(undefined);
  });

  async function inserted() {
    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledOnce());
    return mockInsert.mock.calls[0][0];
  }

  describe('language model calls', () => {
    it('estimates cost from the price table', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        feature: 'suggestions',
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        latency_ms: 400,
        success: true,
      });

      const event = await inserted();
      expect(event.event_type).toBe('ai_generation');
      expect(event.data.cost_source).toBe('estimated');
      expect(event.data.cost_usd).toBeCloseTo(0.5, 10);
      expect(event.data.input_tokens).toBe(1_000_000);
    });

    it('prefers a cost the provider reported over the table', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'openrouter',
        model: 'anthropic/claude-haiku-4.5',
        feature: 'phrases',
        input_tokens: 41_300,
        output_tokens: 9_100,
        reported_cost_usd: 0.0812,
        latency_ms: 900,
        success: true,
      });

      const event = await inserted();
      expect(event.data.cost_source).toBe('measured');
      expect(event.data.cost_usd).toBe(0.0812);
    });

    it('bills transcription input at the audio rate', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        feature: 'transcription',
        input_tokens: 1_000_000,
        latency_ms: 800,
        success: true,
      });

      const event = await inserted();
      expect(event.data.cost_usd).toBeCloseTo(0.3, 10);
    });

    it('records a cache hit as free, with no tokens', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        feature: 'suggestions',
        cached: true,
        latency_ms: 0,
        success: true,
      });

      const event = await inserted();
      expect(event.data.cached).toBe(true);
      expect(event.data.cost_usd).toBe(0);
      expect(event.data.cost_source).toBe('free');
      expect(event.data.input_tokens).toBeUndefined();
    });

    it('records a failure, keeping the reason', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'openrouter',
        model: 'september/free-stack',
        feature: 'suggestions',
        latency_ms: 2100,
        success: false,
        error_message: 'Rate limited',
      });

      const event = await inserted();
      expect(event.data.success).toBe(false);
      expect(event.data.error_message).toBe('Rate limited');
    });

    it('still records usage when we have no price for the model', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'openrouter',
        model: 'anthropic/claude-haiku-4.5',
        feature: 'suggestions',
        input_tokens: 500,
        output_tokens: 100,
        latency_ms: 300,
        success: true,
      });

      const event = await inserted();
      expect(event.data.cost_source).toBe('unknown');
      expect(event.data.cost_usd).toBeUndefined();
      expect(event.data.input_tokens).toBe(500);
    });

    it('records on-device transcription as free, with audio seconds', async () => {
      recordApiCall('user-1', {
        kind: 'llm',
        provider: 'whisper',
        model: 'onnx-community/whisper-base',
        feature: 'transcription',
        audio_seconds: 14,
        latency_ms: 1900,
        success: true,
      });

      const event = await inserted();
      expect(event.data.provider).toBe('whisper');
      expect(event.data.cost_source).toBe('free');
      expect(event.data.cost_usd).toBe(0);
      expect(event.data.audio_seconds).toBe(14);
    });
  });

  describe('speech calls', () => {
    it('converts characters to credits and marks them as quota', async () => {
      recordApiCall('user-1', {
        kind: 'speech',
        provider: 'elevenlabs',
        model: 'eleven_flash_v2_5',
        voice_id: 'voice-xyz',
        characters: 96,
        latency_ms: 280,
        success: true,
      });

      const event = await inserted();
      expect(event.event_type).toBe('tts_generation');
      expect(event.data.provider).toBe('elevenlabs');
      expect(event.data.model).toBe('eleven_flash_v2_5');
      expect(event.data.text_length).toBe(96);
      expect(event.data.credits).toBe(48);
      expect(event.data.cost_source).toBe('quota');
      expect(event.data.cost_usd).toBeUndefined();
    });

    it('records on-device speech under its own provider, as free', async () => {
      recordApiCall('user-1', {
        kind: 'speech',
        provider: 'kokoro',
        model: 'kokoro-82m-v1.0',
        characters: 74,
        latency_ms: 620,
        success: true,
      });

      const event = await inserted();
      expect(event.data.provider).toBe('kokoro');
      expect(event.data.cost_source).toBe('free');
      expect(event.data.cost_usd).toBe(0);
    });
  });

  describe('voice cloning', () => {
    it('records a clone as its own event, with no cost', async () => {
      recordApiCall('user-1', {
        kind: 'clone',
        provider: 'elevenlabs',
        clone_kind: 'clone',
        sample_count: 3,
        latency_ms: 5400,
        success: true,
      });

      const event = await inserted();
      expect(event.event_type).toBe('voice_clone');
      expect(event.data.clone_kind).toBe('clone');
      expect(event.data.sample_count).toBe(3);
      expect(event.data.success).toBe(true);
    });
  });

  it('does not throw when the insert fails', async () => {
    mockInsert.mockRejectedValue(new Error('IndexedDB error'));

    expect(() =>
      recordApiCall('user-1', {
        kind: 'speech',
        provider: 'kokoro',
        model: 'kokoro-82m-v1.0',
        characters: 10,
        latency_ms: 5,
        success: true,
      })
    ).not.toThrow();

    await new Promise(r => setTimeout(r, 0));
  });
});

describe('stored schema — backwards compatibility', () => {
  it('parses an event written before cost tracking existed', () => {
    const old = {
      id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-1',
      event_type: 'ai_generation',
      timestamp: new Date('2026-07-01'),
      data: {
        input_length: 100,
        output_length: 200,
        input_tokens: 12,
        output_tokens: 34,
        latency_ms: 350,
        success: true,
      },
    };

    const parsed = AnalyticsEventSchema.parse(old);

    expect(parsed.event_type).toBe('ai_generation');
    if (parsed.event_type !== 'ai_generation') throw new Error('unreachable');
    expect(parsed.data.generation_type).toBe('suggestions');
    expect(parsed.data.cost_source).toBe('unknown');
    expect(parsed.data.cost_usd).toBeUndefined();
    expect(parsed.data.cached).toBe(false);
  });

  it('parses a pre-cost TTS event, which has no model', () => {
    const old = {
      id: '22222222-2222-4222-8222-222222222222',
      user_id: 'user-1',
      event_type: 'tts_generation',
      timestamp: new Date('2026-07-01'),
      data: { text_length: 80, duration_seconds: 4.2, latency_ms: 600, success: true },
    };

    const parsed = AnalyticsEventSchema.parse(old);

    if (parsed.event_type !== 'tts_generation') throw new Error('unreachable');
    expect(parsed.data.provider).toBe('elevenlabs');
    expect(parsed.data.model).toBe('unknown');
    expect(parsed.data.cost_source).toBe('unknown');
  });
});
