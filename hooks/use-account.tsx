import { useCallback, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import AccountsService from '@/services/accounts';
import supabase from '@/supabase/client';
import type { Account, PutAccountData } from '@/types/account';

const accountService = new AccountsService(supabase);

export function useAccount({
  user: initialUser,
  account: initialAccount,
}: {
  user?: User;
  account?: Account;
}) {
  const [user, setUser] = useState<User | undefined>(initialUser);
  const [account, setAccount] = useState<Account | undefined>(initialAccount);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user ?? undefined);
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
  }, [user, initialAccount]);

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
