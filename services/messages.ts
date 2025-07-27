import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { Alignment, Audio } from '@/types/audio';
import { CreateMessageData, Message } from '@/types/message';

import { generateSpeech } from './elevenlabs';

interface CreateMessageResponse {
  message: Message;
  audio: Audio;
}

class MessagesService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async createMessage(message: CreateMessageData): Promise<CreateMessageResponse> {
    const id = uuidv4();
    const { blob, alignment } = await generateSpeech({ text: message.text });

    const audioPath = await this.uploadAudio({
      path: `${id}.mp3`,
      blob,
      alignment,
    });

    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        id,
        type: message.type,
        text: message.text,
        user_id: message.user_id,
        audio_path: audioPath,
      })
      .select()
      .single();
    if (error) {
      throw error;
    }

    return { message: data, audio: { blob, alignment } };
  }

  async uploadAudio({
    path,
    blob,
    alignment,
  }: {
    path: string;
    blob: string;
    alignment?: Alignment;
  }): Promise<string> {
    const buffer = Buffer.from(blob, 'base64');
    const { data, error } = await this.supabase.storage.from('audio').upload(path, buffer, {
      contentType: 'audio/mp3',
      upsert: true,
      metadata: {
        alignment: alignment,
      },
    });
    if (error) {
      throw error;
    }

    return data.path;
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
      .textSearch('fts', query.replace(/\s+/g, '+'))
      .limit(10);
    if (error) throw error;
    return data;
  }
}

export default MessagesService;
