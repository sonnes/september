import { v4 as uuidv4 } from 'uuid';

import { analyticsCollection } from '../db';
import {
  AIGenerationEvent,
  MessageSentEvent,
  TTSGenerationEvent,
  CreateAnalyticsEvent,
} from '../types';

/**
 * Payload for message sent events
 */
export interface MessageSentPayload {
  text_length: number;
  chat_id?: string;
  keys_typed?: number;
}

/**
 * Payload for AI generation events
 */
export interface AIGenerationPayload {
  generation_type?: 'suggestions' | 'transcription' | 'summary';
  provider?: 'gemini';
  model?: string;
  input_length: number;
  output_length: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
}

/**
 * Payload for TTS generation events
 */
export interface TTSGenerationPayload {
  provider?: 'elevenlabs';
  voice_id?: string;
  text_length: number;
  duration_seconds: number;
  latency_ms: number;
  success: boolean;
  error_message?: string;
}

/**
 * Log a message sent event
 * Fire-and-forget operation with error logging
 *
 * @param userId - The ID of the user who sent the message
 * @param payload - Message event data
 */
export async function logMessageSent(userId: string, payload: MessageSentPayload): Promise<void> {
  try {
    const event: CreateAnalyticsEvent = {
      event_type: 'message_sent',
      user_id: userId,
      id: uuidv4(),
      timestamp: new Date(),
      data: {
        text_length: payload.text_length,
        chat_id: payload.chat_id,
        keys_typed: payload.keys_typed ?? 0,
      },
    };

    // Fire-and-forget insert
    await analyticsCollection.insert(event as MessageSentEvent);
  } catch (err) {
    console.error('Failed to log message_sent event:', err);
  }
}

/**
 * Log an AI generation event
 * Fire-and-forget operation with error logging
 *
 * @param userId - The ID of the user who triggered AI generation
 * @param payload - AI generation event data
 */
export async function logAIGeneration(userId: string, payload: AIGenerationPayload): Promise<void> {
  try {
    const event: CreateAnalyticsEvent = {
      event_type: 'ai_generation',
      user_id: userId,
      id: uuidv4(),
      timestamp: new Date(),
      data: {
        generation_type: payload.generation_type ?? 'suggestions',
        provider: payload.provider ?? 'gemini',
        model: payload.model ?? 'gemini-2.5-flash-lite',
        input_length: payload.input_length,
        output_length: payload.output_length,
        latency_ms: payload.latency_ms,
        success: payload.success,
        error_message: payload.error_message,
      },
    };

    // Fire-and-forget insert
    await analyticsCollection.insert(event as AIGenerationEvent);
  } catch (err) {
    console.error('Failed to log ai_generation event:', err);
  }
}

/**
 * Log a TTS generation event
 * Fire-and-forget operation with error logging
 *
 * @param userId - The ID of the user who triggered TTS generation
 * @param payload - TTS generation event data
 */
export async function logTTSGeneration(userId: string, payload: TTSGenerationPayload): Promise<void> {
  try {
    const event: CreateAnalyticsEvent = {
      event_type: 'tts_generation',
      user_id: userId,
      id: uuidv4(),
      timestamp: new Date(),
      data: {
        provider: payload.provider ?? 'elevenlabs',
        voice_id: payload.voice_id,
        text_length: payload.text_length,
        duration_seconds: payload.duration_seconds,
        latency_ms: payload.latency_ms,
        success: payload.success,
        error_message: payload.error_message,
      },
    };

    // Fire-and-forget insert
    await analyticsCollection.insert(event as TTSGenerationEvent);
  } catch (err) {
    console.error('Failed to log tts_generation event:', err);
  }
}
