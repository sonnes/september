import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { CreateMessageData, Message } from '@/packages/chats';

export class MessagesService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async createMessage(message: CreateMessageData): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        id: message.id || uuidv4(),
        type: message.type,
        text: message.text,
        user_id: message.user_id,
        audio_path: message.audio_path,
      })
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }

  async getMessages(user_id: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  }

  async searchMessages(user_id: string, query: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('user_id', user_id)
      .textSearch(
        'fts',
        query
          .toLowerCase()
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '+')
      )
      .limit(10);
    if (error) throw error;

    return data;
  }
}
