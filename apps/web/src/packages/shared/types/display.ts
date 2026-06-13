/**
 * Message types for display popup BroadcastChannel communication.
 * Audio blob is passed directly to avoid redundant download in popup.
 */

export interface DisplayMessagePayload {
  id?: string;
  text: string;
  type: string;
  user_id: string;
  space_id?: string;
  audio_path?: string;
  created_at: Date;
}

export interface DisplayAlignment {
  characters: string[];
  start_times: number[];
  end_times: number[];
}

export type DisplayMessage = {
  type: 'new-message';
  message: DisplayMessagePayload;
  audio?: string; // base64 encoded audio blob
  alignment?: DisplayAlignment; // character-level timing alignment for audio
  timestamp: number;
};
