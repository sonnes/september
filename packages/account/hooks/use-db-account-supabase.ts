import { useCallback, useEffect, useState } from 'react';
import { SupabaseAccountService } from '../lib/supabase-service';
import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserAccount } from '@/supabase/realtime';
import { Account, PutAccountData } from '../types';
import { User } from '@/types/user';

const accountService = new SupabaseAccountService(supabase);

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
      // Don't throw if not authenticated, just set to undefined
      setUser(undefined);
      return;
    }
    setUser(user);
  };

  useEffect(() => {
    if (initialUser) return;
    getUser();
  }, [initialUser]);

  const getAccount = useCallback(async () => {
    if (!user) return;

    try {
      const account = await accountService.getAccount(user.id);
      if (account) {
        setAccount(account);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
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

      setAccount(account as Account);
    },
    [user]
  );

  useEffect(() => {
    if (initialAccount) {
      setAccount(initialAccount);
      return;
    }
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
    []
  );

  return {
    user,
    account,
    updateAccount,
    uploadFile,
    deleteFile,
    loading: !user && !initialUser, // Simple loading state
  };
}

