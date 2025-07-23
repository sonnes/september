import { SupabaseClient } from '@supabase/supabase-js';

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

  async patchAccount(id: string, account: Partial<PutAccountData>) {
    const { data, error } = await this.supabase
      .from('accounts')
      .update(account)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      throw error;
    }

    return data;
  }
}

export default AccountsService;
