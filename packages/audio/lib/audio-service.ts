import { SupabaseClient } from '@supabase/supabase-js';
import { Alignment } from '@/packages/audio/types';

export class AudioService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async uploadAudio({
    path,
    blob,
    alignment,
    contentType = 'audio/mp3',
    metadata = {},
  }: {
    path: string;
    blob: string;
    alignment?: Alignment;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const buffer = Buffer.from(blob, 'base64');
    const { data, error } = await this.supabase.storage.from('audio').upload(path, buffer, {
      contentType,
      upsert: true,
      metadata: {
        ...metadata,
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

  async deleteAudio(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from('audio').remove([path]);
    if (error) throw error;
  }

  async listAudio(path: string): Promise<any[]> {
    const { data, error } = await this.supabase.storage.from('audio').list(path);
    if (error) throw error;
    return data;
  }
}

