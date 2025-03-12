export interface Voice {
  voice_id: string;
  name?: string;
  category?: string;
  accent?: string;
  gender?: string;
  age?: string;
  descriptive?: string;
  use_case?: string;
  language?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
  public_owner_id?: string;
  is_added_by_user?: boolean;
}

export interface SpeechSettings {
  voice_id?: string;
  model_id?: string;
  speed?: number;
  stability?: number;
  similarity?: number;
  style?: number;
  speaker_boost?: boolean;
}
