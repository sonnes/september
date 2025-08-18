import { SupabaseClient } from '@supabase/supabase-js';
import { TriplitClient } from '@triplit/client';

import { StorageProvider, SupabaseStorageProvider, TriplitStorageProvider } from './storage';
import { schema } from '@/triplit/schema';

class MessagesService {
  private provider: StorageProvider;

  constructor(client: SupabaseClient | TriplitClient<typeof schema>) {
    if ('from' in client) {
      // Supabase client
      this.provider = new SupabaseStorageProvider(client as SupabaseClient);
    } else {
      // Triplit client
      this.provider = new TriplitStorageProvider(client as TriplitClient<typeof schema>);
    }
  }

  async createMessage(message: any) {
    return this.provider.createMessage(message);
  }

  async uploadAudio(params: any) {
    return this.provider.uploadAudio(params);
  }

  async getMessages(user_id: string) {
    return this.provider.getMessages(user_id);
  }

  async searchMessages(user_id: string, query: string) {
    return this.provider.searchMessages(user_id, query);
  }
}

export default MessagesService;
