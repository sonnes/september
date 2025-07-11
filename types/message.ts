import { Audio } from './audio';

export interface Message {
  id: string;
  text: string;
  author_id: string;
  created_at: Date;
  audio?: Audio;
}
