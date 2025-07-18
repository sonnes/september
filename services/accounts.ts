import { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/supabase/server';
import { PutAccountData } from '@/types/account';

class AccountsService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async getAccount(id: string) {
    const { data, error } = await this.supabase.from('accounts').select('*').eq('id', id).single();
    if (error) {
      throw error;
    }

    return data;
  }

  async putAccount(id: string, account: PutAccountData) {
    const { data, error } = await this.supabase
      .from('accounts')
      .upsert({ id, ...account })
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }
}

export default AccountsService;
