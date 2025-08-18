import { v4 as uuidv4 } from 'uuid';

import { TriplitClient } from '@/triplit/client';
import { Alignment } from '@/types/audio';
import { CreateMessageData, Message } from '@/types/message';

import { StorageProvider } from './provider';

export class TriplitStorageProvider extends StorageProvider {
  private triplit: TriplitClient;

  constructor(client: TriplitClient) {
    super();
    this.triplit = client;
  }

  async createMessage(message: CreateMessageData): Promise<Message> {
    const messageId = message.id || uuidv4();

    const messageData = {
      id: messageId,
      text: message.text,
      type: message.type,
      user_id: message.user_id,
      created_at: new Date(),
      audio: message.audio,
    };

    await this.triplit.insert('messages', messageData);

    return messageData as Message;
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
    throw new Error('Not implemented');
  }

  async getMessages(user_id: string): Promise<Message[]> {
    const query = this.triplit
      .query('messages')
      .Where('user_id', '=', user_id)
      .Order('created_at', 'DESC')
      .Limit(100);

    const results = await this.triplit.fetch(query);

    // Convert from Triplit format to Message format
    return results.map(item => ({
      id: item.id,
      text: item.text,
      type: item.type,
      user_id: item.user_id,
      audio_path: item.audio?.path || null,
      created_at: item.created_at,
    }));
  }

  async searchMessages(user_id: string, query: string): Promise<Message[]> {
    // Simple text search for Triplit (no full-text search capabilities like Supabase)
    const searchQuery = this.triplit
      .query('messages')
      .Where('user_id', '=', user_id)
      .Order('created_at', 'DESC')
      .Limit(100);

    const results = await this.triplit.fetch(searchQuery);

    // Filter results that contain the search query
    const normalizedQuery = query.toLowerCase();
    const filtered = results.filter(item => item.text.toLowerCase().includes(normalizedQuery));

    // Convert from Triplit format to Message format and limit to 10
    return filtered.slice(0, 10).map(item => ({
      id: item.id,
      text: item.text,
      type: item.type,
      user_id: item.user_id,
      audio_path: item.audio?.path || null,
      created_at: item.created_at,
    }));
  }
}
