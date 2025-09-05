import { SupabaseClient } from '@supabase/supabase-js';

import { Account, PutAccountData } from '@/types/account';
import { User } from '@/types/user';

class AccountService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  async getCurrentAccount(): Promise<[User | null, Account | null]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      return [null, null];
    }

    const account = await this.getAccount(user.id);
    return [user, account];
  }

  async getAccount(id: string) {
    const { data, error } = await this.supabase.from('accounts').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as Account;
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

export default AccountService;
