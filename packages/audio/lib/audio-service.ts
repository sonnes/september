import { SupabaseClient } from '@supabase/supabase-js';
import { Alignment } from '../types';

export class AudioService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
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

  async downloadAudio(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage.from('audio').download(path);
    if (error) throw error;
    return data;
  }
}

