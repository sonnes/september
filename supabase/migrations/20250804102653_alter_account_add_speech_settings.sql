ALTER TABLE accounts ADD COLUMN speech_provider text DEFAULT 'browser_tts';

ALTER TABLE accounts ADD COLUMN elevenlabs_settings jsonb;

ALTER TABLE accounts ADD COLUMN browser_tts_settings jsonb;
