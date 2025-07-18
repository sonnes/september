import { useCallback, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import supabase from '@/supabase/client';
import type { Account, PutAccountData } from '@/types/account';

export function useAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  };

  useEffect(() => {
    getUser();
  }, []);

  const getAccount = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.from('accounts').select('*').eq('id', user.id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        setAccount(null);
        setError(null);
        return;
      }

      setError(error.message);
      return;
    }

    setAccount(data);
    setError(null);
    setLoading(false);
  }, [user]);

  const putAccount = useCallback(
    async (accountData: PutAccountData) => {
      if (!user) {
        setError('User not found');
        return;
      }

      setError(null);

      const { data, error } = await supabase
        .from('accounts')
        .upsert({
          id: user.id,
          ...accountData,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      setAccount(data);
      setError(null);
    },
    [user]
  );

  useEffect(() => {
    getAccount();
  }, [user]);

  return {
    user,
    account,
    loading,
    error,
    putAccount,
    refetch: getAccount,
  };
}
