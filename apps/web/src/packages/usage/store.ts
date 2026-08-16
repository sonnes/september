import { BasicIndex } from '@tanstack/db';
import { createCollection } from '@tanstack/react-db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

import { CostSource, costOfSpeech, costOfTokens } from './lib/pricing';

// ---------------------------------------------------------------------------
// Public event type — flat discriminated union used by callers
// ---------------------------------------------------------------------------

/** What a generation was for. Drives the plain-language labels in the UI. */
export type GenerationFeature =
  | 'suggestions'
  | 'transcription'
  | 'summary'
  | 'extraction'
  | 'phrases'
  | 'context';

/** Cost fields carried by every provider-call event. */
interface CostTrailer {
  cost_usd?: number;
  cost_source?: CostSource;
}

export type TrackedEvent =
  | { type: 'message_sent'; text_length: number; space_id?: string; keys_typed?: number }
  | ({
      type: 'ai_generation';
      generation_type?: GenerationFeature;
      provider?: string;
      model?: string;
      input_length: number;
      output_length: number;
      input_tokens?: number;
      output_tokens?: number;
      cached_input_tokens?: number;
      audio_seconds?: number;
      cached?: boolean;
      latency_ms: number;
      success: boolean;
      error_message?: string;
    } & CostTrailer)
  | ({
      type: 'tts_generation';
      provider?: string;
      model?: string;
      voice_id?: string;
      text_length: number;
      credits?: number;
      duration_seconds: number;
      latency_ms: number;
      success: boolean;
      error_message?: string;
    } & CostTrailer)
  | {
      type: 'voice_clone';
      provider?: string;
      clone_kind: 'clone' | 'similar';
      sample_count: number;
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

/**
 * Cost fields are optional with permissive defaults so events written before
 * cost tracking existed keep parsing — `unknown` means "no price recorded",
 * which the UI renders as a dash rather than as free.
 */
const CostFields = {
  cost_usd: z.number().min(0).optional(),
  cost_source: z
    .enum(['measured', 'estimated', 'free', 'quota', 'unknown'])
    .default('unknown'),
};

const AIGenerationStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('ai_generation'),
  timestamp: z.coerce.date(),
  data: z.object({
    generation_type: z
      .enum(['suggestions', 'transcription', 'summary', 'extraction', 'phrases', 'context'])
      .default('suggestions'),
    provider: z.string().default('gemini'),
    model: z.string().default('gemini-2.5-flash-lite'),
    input_length: z.number().int().min(0),
    output_length: z.number().int().min(0),
    input_tokens: z.number().int().min(0).optional(),
    output_tokens: z.number().int().min(0).optional(),
    cached_input_tokens: z.number().int().min(0).optional(),
    /** Audio sent for transcription, when the provider bills or reports it. */
    audio_seconds: z.number().min(0).optional(),
    /** Served from the in-memory generation cache — no provider call, no charge. */
    cached: z.boolean().default(false),
    latency_ms: z.number().int().min(0),
    success: z.boolean(),
    error_message: z.string().optional(),
    ...CostFields,
  }),
});

const TTSGenerationStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('tts_generation'),
  timestamp: z.coerce.date(),
  data: z.object({
    provider: z.string().default('elevenlabs'),
    model: z.string().default('unknown'),
    voice_id: z.string().optional(),
    /** Characters sent — the unit speech providers bill on. */
    text_length: z.number().int().min(0),
    /** Provider credits consumed, for quota-billed speech. */
    credits: z.number().min(0).optional(),
    duration_seconds: z.number().min(0),
    latency_ms: z.number().int().min(0),
    success: z.boolean(),
    error_message: z.string().optional(),
    ...CostFields,
  }),
});

const VoiceCloneStoredSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  event_type: z.literal('voice_clone'),
  timestamp: z.coerce.date(),
  data: z.object({
    provider: z.string().default('elevenlabs'),
    clone_kind: z.enum(['clone', 'similar']).default('clone'),
    sample_count: z.number().int().min(0),
    latency_ms: z.number().int().min(0),
    success: z.boolean(),
    error_message: z.string().optional(),
    // No cost fields: cloning consumes a voice slot, not metered units.
  }),
});

export const AnalyticsEventSchema = z.discriminatedUnion('event_type', [
  MessageSentStoredSchema,
  AIGenerationStoredSchema,
  TTSGenerationStoredSchema,
  VoiceCloneStoredSchema,
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

analyticsCollection.createIndex(event => event.timestamp, { indexType: BasicIndex });
analyticsCollection.createIndex(event => event.user_id, { indexType: BasicIndex });

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
        input_tokens: event.input_tokens,
        output_tokens: event.output_tokens,
        cached_input_tokens: event.cached_input_tokens,
        audio_seconds: event.audio_seconds,
        cached: event.cached ?? false,
        latency_ms: event.latency_ms,
        success: event.success,
        error_message: event.error_message,
        cost_usd: event.cost_usd,
        cost_source: event.cost_source ?? 'unknown',
      },
    };
  } else if (event.type === 'tts_generation') {
    stored = {
      id,
      user_id: userId,
      event_type: 'tts_generation',
      timestamp,
      data: {
        provider: event.provider ?? 'elevenlabs',
        model: event.model ?? 'unknown',
        voice_id: event.voice_id,
        text_length: event.text_length,
        credits: event.credits,
        duration_seconds: event.duration_seconds,
        latency_ms: event.latency_ms,
        success: event.success,
        error_message: event.error_message,
        cost_usd: event.cost_usd,
        cost_source: event.cost_source ?? 'unknown',
      },
    };
  } else {
    stored = {
      id,
      user_id: userId,
      event_type: 'voice_clone',
      timestamp,
      data: {
        provider: event.provider ?? 'elevenlabs',
        clone_kind: event.clone_kind,
        sample_count: event.sample_count,
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

// ---------------------------------------------------------------------------
// recordApiCall() — the one entry point for outbound provider calls
// ---------------------------------------------------------------------------

interface BaseApiCall {
  provider: string;
  latency_ms: number;
  success: boolean;
  error_message?: string;
}

export type ApiCall =
  | (BaseApiCall & {
      kind: 'llm';
      model: string;
      feature: GenerationFeature;
      input_tokens?: number;
      output_tokens?: number;
      cached_input_tokens?: number;
      /** Length of the prompt and result in characters, for the efficiency stats. */
      input_length?: number;
      output_length?: number;
      /** Audio sent for transcription. */
      audio_seconds?: number;
      /** Served from the generation cache — recorded, but never charged. */
      cached?: boolean;
      /** Exact charge as reported by the provider. Wins over the price table. */
      reported_cost_usd?: number;
    })
  | (BaseApiCall & { kind: 'speech'; model: string; voice_id?: string; characters: number })
  | (BaseApiCall & { kind: 'clone'; clone_kind: 'clone' | 'similar'; sample_count: number });

/**
 * Record one outbound provider call, pricing it on the way in.
 *
 * Cost is stamped here rather than computed when the dashboard reads: prices
 * move, and an event should keep the price of the day it happened.
 *
 * Fire-and-forget, like `track()` — metering must never break a call path.
 */
export function recordApiCall(userId: string, call: ApiCall): void {
  if (call.kind === 'clone') {
    track(userId, {
      type: 'voice_clone',
      provider: call.provider,
      clone_kind: call.clone_kind,
      sample_count: call.sample_count,
      latency_ms: call.latency_ms,
      success: call.success,
      error_message: call.error_message,
    });
    return;
  }

  if (call.kind === 'speech') {
    const cost = costOfSpeech(call.provider, call.model, call.characters);

    track(userId, {
      type: 'tts_generation',
      provider: call.provider,
      model: call.model,
      voice_id: call.voice_id,
      text_length: call.characters,
      credits: cost.credits,
      // Playback length is not known at the call site; the audio itself carries it.
      duration_seconds: 0,
      latency_ms: call.latency_ms,
      success: call.success,
      error_message: call.error_message,
      cost_usd: cost.amount_usd,
      cost_source: cost.source,
    });
    return;
  }

  // A cache hit never reached the provider, so it cannot have been charged.
  const cost = call.cached
    ? { amount_usd: 0, source: 'free' as CostSource }
    : call.reported_cost_usd !== undefined
      ? { amount_usd: call.reported_cost_usd, source: 'measured' as CostSource }
      : costOfTokens(call.provider, call.model, {
          input: call.input_tokens,
          output: call.output_tokens,
          audio_input: call.feature === 'transcription',
        });

  track(userId, {
    type: 'ai_generation',
    generation_type: call.feature,
    provider: call.provider,
    model: call.model,
    input_length: call.input_length ?? 0,
    output_length: call.output_length ?? 0,
    input_tokens: call.input_tokens,
    output_tokens: call.output_tokens,
    cached_input_tokens: call.cached_input_tokens,
    audio_seconds: call.audio_seconds,
    cached: call.cached ?? false,
    latency_ms: call.latency_ms,
    success: call.success,
    error_message: call.error_message,
    cost_usd: cost.amount_usd,
    cost_source: cost.source,
  });
}
