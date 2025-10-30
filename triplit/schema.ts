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

      // AI Feature Configurations
      ai_suggestions: S.Optional(S.Json()),
      ai_transcription: S.Optional(S.Json()),
      ai_speech: S.Optional(S.Json()),

      // Provider Config (sensitive)
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
  messages: {
    schema: S.Schema({
      id: S.Id({ format: 'uuidv4' }),
      text: S.String(),
      type: S.String(),
      user_id: S.String(),
      audio_path: S.Optional(S.String()),
      created_at: S.Date({ default: S.Default.now() }),
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
