import { Audio } from './audio';

export interface Message {
  id: string;
  text: string;
  type: string;
  user_id: string;
  created_at: Date;
  audio_path?: string;
  audio?: Audio;
}

export interface CreateMessageData {
  id?: string;
  chat_id?: string;
  text: string;
  type: string;
  user_id: string;
  audio_path?: string;
  audio?: Audio;
}
