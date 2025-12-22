import { SupabaseClient } from '@supabase/supabase-js';
import { Account } from '../types';
import { User } from '@/types/user';

export class SupabaseAccountService {
  private supabase: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.supabase = client;
  }

  /**
   * Gets the current authenticated user.
   * Note: Account data fetching from Supabase is deprecated in favor of TanStack DB.
   */
  async getCurrentAccount(): Promise<[User | null, Account | null]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      return [null, null];
    }

    return [user as User, null];
      }
}
