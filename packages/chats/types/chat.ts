import { Message } from '@/packages/chats/types/message';

export interface Chat {
  id: string;
  user_id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
  messages?: Message[];
}
