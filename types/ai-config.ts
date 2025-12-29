/**
 * AI Configuration Types
 * Defines types for AI feature configurations across the application
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'gemini' | 'elevenlabs' | 'browser' | 'webllm';

/**
 * AI feature identifiers
 */
export type AIFeature = 'ai' | 'suggestions' | 'transcription' | 'voice-cloning' | 'speech';

/**
 * Base configuration for any AI feature
 */
export interface BaseFeatureConfig {
  /** Whether this feature is enabled */
  enabled: boolean;

  /** AI provider to use for this feature */
  provider: AIProvider;

  /** Model ID (provider-specific) */
  model?: string;

  /** Provider-specific settings */
  settings?: Record<string, unknown>;
}

/**
 * Configuration for AI-powered typing suggestions
 */
export interface SuggestionsConfig extends BaseFeatureConfig {
  provider: 'gemini' | 'webllm';
  model?: string;
  settings?: {
    /** Temperature for generation (0-1) */
    temperature?: number;

    /** Maximum number of suggestions to generate */
    max_suggestions?: number;

    /** Number of previous messages to include as context */
    context_window?: number;

    /** Custom system instructions */
    system_instructions?: string;

    /** Custom corpus */
    ai_corpus?: string;
  };
}

/**
 * Configuration for speech-to-text transcription
 */
export interface TranscriptionConfig extends BaseFeatureConfig {
  provider: 'gemini';
  model?: string;
  settings?: {
    /** Language code (e.g., 'en-US') */
    language?: string;

    /** Auto-detect language */
    detect_language?: boolean;

    /** Include timestamps in transcription */
    include_timestamps?: boolean;

    /** Filter profanity */
    filter_profanity?: boolean;
  };
}

/**
 * ElevenLabs text-to-speech settings
 */
export interface ElevenLabsSettings extends Record<string, unknown> {
  /** Model ID for ElevenLabs */
  model_id?: string;

  /** Voice stability (0-1) */
  stability?: number;

  /** Similarity boost (0-1) */
  similarity?: number;

  /** Style exaggeration (0-1) */
  style?: number;

  /** Speaker boost for clarity */
  speaker_boost?: boolean;

  /** Speech speed (0.7-1.2) */
  speed?: number;
}

/**
 * Browser text-to-speech settings
 */
export interface BrowserTTSSettings extends Record<string, unknown> {
  /** Speech speed (0.5-2.0) */
  speed?: number;

  /** Voice pitch (-20 to 20) */
  pitch?: number;

  /** Volume (0-1) */
  volume?: number;

  /** Language code (e.g., 'en-US') */
  language?: string;
}

/**
 * Gemini text-to-speech settings
 */
export interface GeminiSpeechSettings extends Record<string, unknown> {
  /** Model ID for Gemini TTS */
  model_id?: string;

  /** Voice name for Gemini TTS */
  voice_name?: string;
}

/**
 * Configuration for text-to-speech
 */
export interface SpeechConfig {
  provider: 'browser' | 'gemini' | 'elevenlabs';

  /** Voice ID (provider-specific) */
  voice_id?: string;

  /** Voice name (provider-specific) */
  voice_name?: string;

  /** Model ID (provider-specific) */
  model_id?: string;

  settings?: BrowserTTSSettings & GeminiSpeechSettings & ElevenLabsSettings;
}

export interface ProviderConfig {
  api_key?: string;
  base_url?: string;
}

/**
 * Provider configuration (sensitive data)
 */
export type Providers = {
  [K in AIProvider]?: ProviderConfig;
};

/**
 * Provider metadata for UI and validation
 */
export interface AIServiceProvider {
  id: AIProvider;
  name: string;
  description: string;
  features: AIFeature[];
  requires_api_key: boolean;
  api_key_url?: string;
  models?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}
