-- Migration: Add AI configuration fields and drop legacy fields
-- File: supabase/migrations/20251026063700_add_ai_config_fields.sql

-- Drop legacy AI-related columns
ALTER TABLE public.accounts
DROP COLUMN IF EXISTS speech_provider,
DROP COLUMN IF EXISTS speech_settings,
DROP COLUMN IF EXISTS voice,
DROP COLUMN IF EXISTS ai_instructions,
DROP COLUMN IF EXISTS ai_corpus,
DROP COLUMN IF EXISTS gemini_api_key;

-- Add new AI feature configuration columns
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

-- Add documentation comments
COMMENT ON COLUMN public.accounts.ai_suggestions IS
  'Configuration for AI-powered typing suggestions feature';
COMMENT ON COLUMN public.accounts.ai_transcription IS
  'Configuration for speech-to-text transcription feature';
COMMENT ON COLUMN public.accounts.ai_speech IS
  'Configuration for text-to-speech feature';
COMMENT ON COLUMN public.accounts.ai_providers IS
  'Encrypted API keys and base URLs for AI providers (sensitive data)';
