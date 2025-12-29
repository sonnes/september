/**
 * Message types for display popup BroadcastChannel communication
 * Audio blob is passed directly to avoid redundant Supabase download in popup
 */

import { Message } from '@/packages/chats';
import { Alignment } from '@/packages/audio';

export type DisplayMessage = {
  type: 'new-message';
  message: Message;
  audio?: string; // base64 encoded audio blob
  alignment?: Alignment; // character-level timing alignment for audio
  timestamp: number;
};
