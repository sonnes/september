# AI Configuration Storage Specification

## Overview

This specification defines the database schema and storage layer for AI configuration in the September application. The design uses a symmetric schema approach across both Supabase (cloud) and Triplit (local) databases.

## Design Principles

1. **Separate Fields**: Each feature config stored in its own column (not nested in single JSON)
2. **Symmetric Schema**: Identical structure in both Supabase and Triplit
3. **Security**: Provider credentials separated and encrypted in Supabase only
4. **Type Safety**: Strong TypeScript types for all configurations

---

## Database Schemas

### Supabase Schema

```sql
-- Migration: Add AI configuration fields
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_ai_config_fields.sql

-- Add feature configuration columns
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB DEFAULT '{
  "enabled": false,
  "provider": "gemini",
  "model": "gemini-2.5-flash-lite",
  "settings": {}
}'::jsonb,

ADD COLUMN IF NOT EXISTS ai_transcription JSONB DEFAULT '{
  "enabled": false,
  "provider": "gemini",
  "model": "gemini-2.5-flash-lite",
  "settings": {}
}'::jsonb,

ADD COLUMN IF NOT EXISTS ai_speech JSONB DEFAULT '{
  "enabled": true,
  "provider": "browser",
  "settings": {}
}'::jsonb,

-- Provider config (encrypted, sensitive)
ADD COLUMN IF NOT EXISTS ai_providers JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.ai_suggestions IS
  'Configuration for AI-powered typing suggestions feature';
COMMENT ON COLUMN public.accounts.ai_transcription IS
  'Configuration for speech-to-text transcription feature';
COMMENT ON COLUMN public.accounts.ai_speech IS
  'Configuration for text-to-speech feature';
COMMENT ON COLUMN public.accounts.ai_providers IS
  'Encrypted API keys and base URLs for AI providers (sensitive data)';
```

### Triplit Schema

```typescript
// File: triplit/schema.ts
import { Schema as S } from '@triplit/client';

export const schema = S.Collections({
  accounts: {
    schema: S.Schema({
      id: S.Id(),

      // Personal Information
      name: S.String(),
      city: S.Optional(S.String()),
      country: S.Optional(S.String()),

      // Medical Information
      primary_diagnosis: S.Optional(S.String()),
      year_of_diagnosis: S.Optional(S.Number()),
      medical_document_path: S.Optional(S.String()),

      // AI Feature Configurations (same structure as Supabase)
      ai_suggestions: S.Optional(S.Json()),
      ai_transcription: S.Optional(S.Json()),
      ai_speech: S.Optional(S.Json()),

      // Provider config (sensitive)
      ai_providers: S.Optional(S.Json()),

      // Flags
      terms_accepted: S.Optional(S.Boolean()),
      privacy_policy_accepted: S.Optional(S.Boolean()),
      onboarding_completed: S.Optional(S.Boolean()),

      // Timestamps
      created_at: S.Date({ default: S.Default.now() }),
      updated_at: S.Date({ default: S.Default.now() }),
    }),
  },
  // ... other collections
});
```

---

## TypeScript Type Definitions

### Core Types

```typescript
// File: types/ai-config.ts

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
 * Configuration for text-to-speech
 */
export interface SpeechConfig extends BaseFeatureConfig {
  provider: 'elevenlabs' | 'browser';

  /** Voice ID (provider-specific) */
  voiceId?: string;

  settings?: ElevenLabsSettings | BrowserTTSSettings;
}

/**
 * ElevenLabs text-to-speech settings
 */
export interface ElevenLabsSettings {
  /** Voice stability (0-1) */
  stability?: number;

  /** Similarity boost (0-1) */
  similarity_boost?: number;
}

/**
 * Browser text-to-speech settings
 */
export interface BrowserTTSSettings {
  /** Speech speed (0.1-10) */
  speed?: number;

  /** Voice pitch (0-2) */
  pitch?: number;

  /** Volume (0-1) */
  volume?: number;
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
```

### Updated Account Type

```typescript
// File: types/account.ts
import { ProviderConfig, SpeechConfig, SuggestionsConfig, TranscriptionConfig } from './ai-config';
import { Voice } from './voice';

export interface Account {
  id: string;

  // Personal Information
  name: string;
  city?: string;
  country?: string;

  // Medical Information
  primary_diagnosis?: string;
  year_of_diagnosis?: number;
  medical_document_path?: string;

  // AI Feature Configurations (NEW)
  ai_suggestions?: SuggestionsConfig;
  ai_transcription?: TranscriptionConfig;
  ai_speech?: SpeechConfig;

  // Provider Config (NEW - Supabase only)
  ai_providers?: ProviderConfig;

  // DEPRECATED: Legacy fields (keep for backward compatibility)
  speech_provider?: string;
  speech_settings?: BrowserTTSSettings & ElevenLabsSettings;
  voice?: Voice;
  ai_instructions?: string;
  ai_corpus?: string;
  gemini_api_key?: string;

  // Flags
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  onboarding_completed?: boolean;
  is_approved?: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export type PutAccountData = Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>;
```

---

## Default Configurations

```typescript
// File: lib/ai/defaults.ts
import { SpeechConfig, SuggestionsConfig, TranscriptionConfig } from '@/types/ai-config';

export const DEFAULT_SUGGESTIONS_CONFIG: SuggestionsConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {
    temperature: 0.7,
    maxSuggestions: 5,
    contextWindow: 10,
  },
};

export const DEFAULT_TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  enabled: false,
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  settings: {
    detectLanguage: true,
    includeTimestamps: false,
    filterProfanity: false,
  },
};

export const DEFAULT_SPEECH_CONFIG: SpeechConfig = {
  enabled: true,
  provider: 'browser', // Safe default for all users
  settings: {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
};
```
