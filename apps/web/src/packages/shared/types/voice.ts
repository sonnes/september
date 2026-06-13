export interface Voice {
  id: string;
  name: string;
  language: string;
  gender?: string;
  accent?: string;
  age?: string;
  use_case?: string;
  description?: string;
  category?: string;
  preview_url?: string;
}

export interface VoiceSettings {
  voice_id?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}
