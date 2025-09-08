import { useCallback, useEffect, useState } from 'react';

import { useQueryOne } from '@triplit/react';

import { triplit } from '@/triplit/client';
import type { Account, PutAccountData } from '@/types/account';
import { User } from '@/types/user';

const defaultAccount = {
  id: 'local-user',
  name: '',
};

export function useAccountTriplit() {
  const query = triplit.query('accounts').Where('id', '=', defaultAccount.id);
  const { result: account, fetching, error } = useQueryOne(triplit, query);

  useEffect(() => {
    if (!fetching && !account) {
      triplit.insert('accounts', defaultAccount);
    }
  }, [fetching, account]);

  const putAccount = useCallback(
    async (accountData: PutAccountData) => {
      if (!account) {
        throw new Error('Account not found');
      }

      // For Triplit implementation, update local state
      // In a real implementation, this would use Triplit client
      const updatedAccount = { ...account, ...accountData, updated_at: new Date() };
      triplit.update('accounts', account.id, updatedAccount);

      // TODO: Implement Triplit storage
      console.log('Triplit putAccount:', accountData);
    },
    [account]
  );

  const patchAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!account) {
        throw new Error('Account not found');
      }

      // For Triplit implementation, update local state
      // In a real implementation, this would use Triplit client
      const updatedAccount = { ...accountData, updated_at: new Date() };
      triplit.update('accounts', account.id, updatedAccount);
      // TODO: Implement Triplit storage
      console.log('Triplit patchAccount:', accountData);
    },
    [account]
  );

  const refetch = useCallback(async () => {
    // For Triplit, this would query local storage
    // Currently just maintaining existing state
    console.log('Triplit refetch account');
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!account) {
        throw new Error('Account not found');
      }

      // For Triplit implementation, this would handle local file storage
      // Return a local path or blob URL
      const localPath = `local/${account.id}/${file.name}`;

      // TODO: Implement local file storage
      console.log('Triplit uploadFile:', file.name);

      return localPath;
    },
    [account]
  );

  const deleteFile = useCallback(async (path: string) => {
    // For Triplit implementation, this would remove from local storage
    // TODO: Implement local file deletion
    console.log('Triplit deleteFile:', path);
  }, []);

  return {
    user: account || (defaultAccount as User),
    account: account as Account,
    putAccount,
    patchAccount,
    refetch,
    uploadFile,
    deleteFile,
  };
}
