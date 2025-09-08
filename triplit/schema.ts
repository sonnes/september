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
      primary_diagnosis: S.String(),
      year_of_diagnosis: S.Number(),
      medical_document_path: S.String(),

      // Speech Settings
      speech_provider: S.Optional(S.String()),
      speech_settings: S.Optional(S.Json()),
      voice: S.Optional(S.Json()),

      // AI Settings
      ai_instructions: S.Optional(S.String()),
      ai_corpus: S.Optional(S.String()),
      gemini_api_key: S.Optional(S.String()),

      // Flags
      terms_accepted: S.Optional(S.Boolean()),
      privacy_policy_accepted: S.Optional(S.Boolean()),
      onboarding_completed: S.Optional(S.Boolean()),

      // Timestamps
      created_at: S.Date({ default: S.Default.now() }),
      updated_at: S.Date({ default: S.Default.now() }),
    }),
  },
  messages: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      type: S.String(),
      user_id: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      audio: S.Json({ nullable: true }),
    }),
  },
  documents: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      name: S.String(),
      content: S.String(),
      created_at: S.Date({ default: S.Default.now() }),
      updated_at: S.Date({ default: S.Default.now() }),
    }),
  },
  audio_files: {
    schema: S.Schema({
      id: S.Id(),
      blob: S.String(),
      alignment: S.Optional(S.Json()),
      created_at: S.Date({ default: S.Default.now() }),
    }),
  },
});
