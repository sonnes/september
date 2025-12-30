import { z } from 'zod';

/**
 * Base event schema for all analytics events
 * All events must include these common fields
 */
export const BaseEventSchema = z.object({
  // Unique identifier for the event
  id: z.string().uuid(),
  // User ID who triggered the event
  user_id: z.string(),
  // Event type discriminator (for union type)
  event_type: z.enum(['message_sent', 'ai_generation', 'tts_generation']),
  // Timestamp when the event occurred
  timestamp: z.coerce.date(),
  // Session ID for grouping related events
  session_id: z.string().optional(),
  // Metadata for additional context
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Event schema for when a user sends a message
 */
export const MessageSentEventSchema = BaseEventSchema.extend({
  event_type: z.literal('message_sent'),
  data: z.object({
    // Length of the message text
    text_length: z.number().int().min(0),
    // Chat/conversation ID
    chat_id: z.string().uuid().optional(),
    // Total keystrokes (physical keyboard + virtual keyboard)
    keys_typed: z.number().int().min(0).default(0),
  }),
});

/**
 * Event schema for when AI generates content
 */
export const AIGenerationEventSchema = BaseEventSchema.extend({
  event_type: z.literal('ai_generation'),
  data: z.object({
    // Type of AI generation (suggestions, transcription, etc)
    generation_type: z.enum(['suggestions', 'transcription', 'summary']).default('suggestions'),
    // AI provider used (gemini, etc)
    provider: z.enum(['gemini']).default('gemini'),
    // Model name used
    model: z.string().default('gemini-2.5-flash-lite'),
    // Input prompt length
    input_length: z.number().int().min(0),
    // Output length
    output_length: z.number().int().min(0),
    // Time taken in milliseconds
    latency_ms: z.number().int().min(0),
    // Whether the generation was successful
    success: z.boolean(),
    // Error message if generation failed
    error_message: z.string().optional(),
  }),
});

/**
 * Event schema for when TTS generates speech
 */
export const TTSGenerationEventSchema = BaseEventSchema.extend({
  event_type: z.literal('tts_generation'),
  data: z.object({
    // TTS provider used (elevenLabs, etc)
    provider: z.enum(['elevenlabs']).default('elevenlabs'),
    // Voice ID used
    voice_id: z.string().optional(),
    // Text length that was converted to speech
    text_length: z.number().int().min(0),
    // Audio duration in seconds
    duration_seconds: z.number().min(0),
    // Time taken to generate in milliseconds
    latency_ms: z.number().int().min(0),
    // Whether generation was successful
    success: z.boolean(),
    // Error message if generation failed
    error_message: z.string().optional(),
  }),
});

/**
 * Discriminated union of all possible analytics events
 * Use this as the main type for event handling
 */
export const AnalyticsEventSchema = z.discriminatedUnion('event_type', [
  MessageSentEventSchema,
  AIGenerationEventSchema,
  TTSGenerationEventSchema,
]);

/**
 * Inferred TypeScript types from schemas
 */
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type MessageSentEvent = z.infer<typeof MessageSentEventSchema>;
export type AIGenerationEvent = z.infer<typeof AIGenerationEventSchema>;
export type TTSGenerationEvent = z.infer<typeof TTSGenerationEventSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/**
 * Helper type for creating events without id and timestamp
 */
export type CreateAnalyticsEvent = Omit<AnalyticsEvent, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: Date;
};

/**
 * Helper types for aggregation queries
 */
export interface EventStats {
  total_events: number;
  events_by_type: Record<string, number>;
  unique_users: number;
  date_range: {
    start_date: Date;
    end_date: Date;
  };
}

export interface EventFilter {
  user_id?: string;
  event_type?: AnalyticsEvent['event_type'] | AnalyticsEvent['event_type'][];
  date_range?: {
    start_date: Date;
    end_date: Date;
  };
  session_id?: string;
}
