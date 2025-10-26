/**
 * AI Configuration Types
 * Defines types for AI feature configurations across the application
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'gemini' | 'elevenlabs' | 'browser';

/**
 * AI feature identifiers
 */
export type AIFeature = 'suggestions' | 'transcription' | 'speech';

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
  provider: 'gemini';
  model: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  settings?: {
    /** Temperature for generation (0-1) */
    temperature?: number;

    /** Maximum number of suggestions to generate */
    maxSuggestions?: number;

    /** Number of previous messages to include as context */
    contextWindow?: number;

    /** Custom system instructions */
    systemInstructions?: string;
  };
}

/**
 * Configuration for speech-to-text transcription
 */
export interface TranscriptionConfig extends BaseFeatureConfig {
  provider: 'gemini';
  model: 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  settings?: {
    /** Language code (e.g., 'en-US') */
    language?: string;

    /** Auto-detect language */
    detectLanguage?: boolean;

    /** Include timestamps in transcription */
    includeTimestamps?: boolean;

    /** Filter profanity */
    filterProfanity?: boolean;
  };
}

/**
 * ElevenLabs text-to-speech settings
 */
export interface ElevenLabsSettings extends Record<string, unknown> {
  /** Voice stability (0-1) */
  stability?: number;

  /** Similarity boost (0-1) */
  similarity_boost?: number;
}

/**
 * Browser text-to-speech settings
 */
export interface BrowserTTSSettings extends Record<string, unknown> {
  /** Speech speed (0.1-10) */
  speed?: number;

  /** Voice pitch (0-2) */
  pitch?: number;

  /** Volume (0-1) */
  volume?: number;
}

/**
 * Configuration for text-to-speech
 */
export interface SpeechConfig extends BaseFeatureConfig {
  provider: 'elevenlabs' | 'browser';

  /** Voice ID (provider-specific) */
  voiceId?: string;

  settings?: ElevenLabsSettings | BrowserTTSSettings;
}

/**
 * Provider configuration (sensitive data)
 * NEVER store in Triplit/local storage
 */
export interface ProviderConfig {
  gemini?: {
    apiKey: string;
    baseUrl?: string;
  };
  elevenLabs?: {
    apiKey: string;
    baseUrl?: string;
  };
}

/**
 * Provider metadata for UI and validation
 */
export interface AIServiceProvider {
  id: AIProvider;
  name: string;
  description: string;
  features: AIFeature[];
  requiresApiKey: boolean;
  models?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}
