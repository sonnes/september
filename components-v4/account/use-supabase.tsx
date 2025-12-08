import { useCallback, useEffect, useState } from 'react';

import AccountsService from '@/services/account/supabase';

import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserAccount } from '@/supabase/realtime';
import type { Account, PutAccountData } from '@/types/account';
import type { User } from '@/types/user';

const accountService = new AccountsService(supabase);

export function useAccountSupabase({
  user: initialUser,
  account: initialAccount,
}: {
  user?: User;
  account?: Account;
}) {
  const [user, setUser] = useState<User | undefined>(initialUser);
  const [account, setAccount] = useState<Account | undefined>();

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not found');
    }
    setUser(user);
  };

  useEffect(() => {
    if (initialUser) return;

    getUser();
  }, [initialUser]);

  const getAccount = useCallback(async () => {
    if (!user || initialAccount) return;

    const account = await accountService.getAccount(user.id);

    if (!account) {
      throw new Error('Account not found');
    }

    setAccount(account);
  }, [user, initialAccount]);

  useEffect(() => {
    getAccount();
  }, [user, initialAccount]);

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const account = await accountService.updateAccount(user.id, accountData);

      if (!account) {
        throw new Error('Account not found');
      }

      setAccount(account);
    },
    [user]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!account) {
        throw new Error('Account must be authenticated');
      }

      const fileName = `${account.id}/${file.name}`;
      const { data, error } = await supabase.storage.from('documents').upload(fileName, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

      if (error) throw error;

      return data.path;
    },
    [account]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      await supabase.storage.from('documents').remove([path]);
    },
    [account]
  );

  return {
    user,
    account,
    updateAccount,
    uploadFile,
    deleteFile,
  };
}
