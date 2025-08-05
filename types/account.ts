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

  // TTS
  browser_tts_settings?: BrowserTTSSettings;
  elevenlabs_settings?: ElevenLabsSettings;

  // AI Settings
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
  ai_instructions?: string;
  ai_corpus?: string;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  speech_provider?: string;
  elevenlabs_settings?: ElevenLabsSettings;
}

export interface BrowserTTSSettings {
  voice_id?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface ElevenLabsSettings {
  api_key?: string;
  model_id?: string;
  voice_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}
