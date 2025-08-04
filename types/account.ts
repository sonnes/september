export interface Account {
  id: string;
  user_id: string;

  // Personal Information
  name: string;
  city?: string;
  country?: string;

  // Medical Information
  primary_diagnosis: string;
  year_of_diagnosis: number;
  medical_document_path: string;

  // Speech Settings
  speech_provider?: string;
  speech_voice_id?: string;
  speech_settings?: SpeechSettings;

  // ElevenLabs
  elevenlabs_api_key?: string;

  // AI Settings
  google_api_key?: string;
  ai_instructions?: string;
  ai_corpus?: string;

  // Flags
  terms_accepted: boolean;
  privacy_policy_accepted: boolean;
  onboarding_completed: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

export interface PutAccountData {
  name?: string;
  city?: string;
  country?: string;
  primary_diagnosis?: string;
  year_of_diagnosis?: number;
  medical_document_path?: string;
  elevenlabs_api_key?: string;
  google_api_key?: string;
  ai_instructions?: string;
  ai_corpus?: string;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  speech_provider?: string;
  speech_voice_id?: string;
  speech_settings?: SpeechSettings;
}

export interface SpeechSettings {
  model_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}
