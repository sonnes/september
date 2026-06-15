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
    insert: (data: unknown) => makeTx(mockInsert(data)),
  })),
}));

vi.mock('@/packages/shared/lib/indexeddb', () => ({
  indexedDBCollectionOptionsV2: vi.fn(config => config),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

import { track } from './store';
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
