import { useCallback, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import AccountsService from '@/services/accounts';
import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserAccount } from '@/supabase/realtime';
import type { Account, PutAccountData } from '@/types/account';

const accountService = new AccountsService(supabase);

export function useAccountSupabase({
  user: initialUser,
  account: initialAccount,
}: {
  user: User;
  account: Account;
}) {
  const [user, setUser] = useState<User>(initialUser);
  const [account, setAccount] = useState<Account>(initialAccount);

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
    if (!user) return;

    const account = await accountService.getAccount(user.id);

    setAccount(account);
  }, [user]);

  const putAccount = useCallback(
    async (accountData: PutAccountData) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const account = await accountService.putAccount(user.id, accountData);

      setAccount(account);
    },
    [user]
  );

  const patchAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const account = await accountService.patchAccount(user.id, accountData);

      setAccount(account);
    },
    [user]
  );

  useEffect(() => {
    if (initialAccount) return;

    getAccount();
  }, [user, initialAccount, getAccount]);

  // Realtime subscription for account changes
  useEffect(() => {
    if (!user) return;

    const channel = subscribeToUserAccount<Account>(user.id, {
      onInsert: newAccount => {
        setAccount(newAccount);
      },
      onUpdate: updatedAccount => {
        setAccount(updatedAccount);
      },
      onError: error => {
        console.error('Account realtime error:', error);
      },
      onSubscribe: status => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to account changes');
        }
      },
    });

    // Cleanup function to unsubscribe on unmount
    return () => {
      removeRealtimeSubscription(channel);
    };
  }, [user]);

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
    [account?.medical_document_path]
  );

  return {
    user,
    account,
    putAccount,
    patchAccount,
    refetch: getAccount,
    uploadFile,
    deleteFile,
  };
}
