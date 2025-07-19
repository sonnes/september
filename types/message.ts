import { Audio } from './audio';

export interface Message {
  id: string;
  text: string;
  type: string;
  user_id: string;
  created_at: Date;
  audio?: Audio;
}

export interface CreateMessageData {
  text: string;
  type: string;
  user_id: string;
}
