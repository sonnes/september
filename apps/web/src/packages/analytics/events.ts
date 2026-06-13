import { createCollection } from '@tanstack/react-db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

// ---------------------------------------------------------------------------
// Public event type — flat discriminated union used by callers
// ---------------------------------------------------------------------------

export type TrackedEvent =
  | { type: 'message_sent'; text_length: number; space_id?: string; keys_typed?: number }
  | {
      type: 'ai_generation';
      generation_type?: 'suggestions' | 'transcription' | 'summary';
      provider?: string;
      model?: string;
      input_length: number;
      output_length: number;
      latency_ms: number;
      success: boolean;
      error_message?: string;
    }
  | {
      type: 'tts_generation';
      provider?: string;
      voice_id?: string;
      text_length: number;
      duration_seconds: number;
      latency_ms: number;
      success: boolean;
      error_message?: string;
    };

// ---------------------------------------------------------------------------
// Stored event schema — shape on disk; must stay backwards-compatible
// ---------------------------------------------------------------------------

const MessageSentStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('message_sent'),
  timestamp: z.coerce.date(),
  data: z.object({
    text_length: z.number().int().min(0),
    space_id: z.string().uuid().optional(),
    keys_typed: z.number().int().min(0).default(0),
  }),
});

const AIGenerationStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('ai_generation'),
  timestamp: z.coerce.date(),
  data: z.object({
    generation_type: z.enum(['suggestions', 'transcription', 'summary']).default('suggestions'),
    provider: z.string().default('gemini'),
    model: z.string().default('gemini-2.5-flash-lite'),
    input_length: z.number().int().min(0),
    output_length: z.number().int().min(0),
    latency_ms: z.number().int().min(0),
    success: z.boolean(),
    error_message: z.string().optional(),
  }),
});

const TTSGenerationStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('tts_generation'),
  timestamp: z.coerce.date(),
  data: z.object({
    provider: z.string().default('elevenlabs'),
    voice_id: z.string().optional(),
    text_length: z.number().int().min(0),
    duration_seconds: z.number().min(0),
    latency_ms: z.number().int().min(0),
    success: z.boolean(),
    error_message: z.string().optional(),
  }),
});

export const AnalyticsEventSchema = z.discriminatedUnion('event_type', [
  MessageSentStoredSchema,
  AIGenerationStoredSchema,
  TTSGenerationStoredSchema,
]);

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export const analyticsCollection = createCollection(
  indexedDBCollectionOptionsV2({
    id: 'analytics-events',
    schema: AnalyticsEventSchema,
    getKey: (event: AnalyticsEvent) => event.id,
    kvStoreOptions: {
      dbName: 'analytics',
      storeName: 'analytics_events',
      version: 1,
    },
    channelName: 'analytics-collection',
  })
);

// ---------------------------------------------------------------------------
// track() — fire-and-forget public API
// ---------------------------------------------------------------------------

export function track(userId: string, event: TrackedEvent): void {
  const id = uuidv4();
  const timestamp = new Date();

  let stored: AnalyticsEvent;

  if (event.type === 'message_sent') {
    stored = {
      id,
      user_id: userId,
      event_type: 'message_sent',
      timestamp,
      data: {
        text_length: event.text_length,
        space_id: event.space_id,
        keys_typed: event.keys_typed ?? 0,
      },
    };
  } else if (event.type === 'ai_generation') {
    stored = {
      id,
      user_id: userId,
      event_type: 'ai_generation',
      timestamp,
      data: {
        generation_type: event.generation_type ?? 'suggestions',
        provider: event.provider ?? 'gemini',
        model: event.model ?? 'gemini-2.5-flash-lite',
        input_length: event.input_length,
        output_length: event.output_length,
        latency_ms: event.latency_ms,
        success: event.success,
        error_message: event.error_message,
      },
    };
  } else {
    stored = {
      id,
      user_id: userId,
      event_type: 'tts_generation',
      timestamp,
      data: {
        provider: event.provider ?? 'elevenlabs',
        voice_id: event.voice_id,
        text_length: event.text_length,
        duration_seconds: event.duration_seconds,
        latency_ms: event.latency_ms,
        success: event.success,
        error_message: event.error_message,
      },
    };
  }

  const tx = analyticsCollection.insert(stored);
  tx.isPersisted.promise.catch((err: unknown) => {
    console.error(`Failed to track ${event.type} event:`, err);
  });
}
