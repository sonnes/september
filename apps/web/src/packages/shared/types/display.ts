/**
 * Message types for the separate display window. The browser uses
 * BroadcastChannel; Tauri uses a targeted window event. Base64 audio is
 * passed directly to avoid a second storage read.
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
