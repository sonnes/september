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
  user: User | undefined;
  account: Account | undefined;
} = { user: undefined, account: undefined }) {
  const [user, setUser] = useState<User | undefined>(initialUser);
  const [account, setAccount] = useState<Account | undefined>(initialAccount);

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

    if (!account) {
      throw new Error('Account not found');
    }

    setAccount(account);
  }, [user]);

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
    updateAccount,
    uploadFile,
    deleteFile,
  };
}
