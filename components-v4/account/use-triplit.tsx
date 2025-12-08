import { useCallback, useEffect, useState } from 'react';

import { useQueryOne } from '@triplit/react';

import { triplit } from '@/triplit/client';
import type { Account, PutAccountData } from '@/types/account';
import { User } from '@/types/user';

const ID = 'local-user';

export function useAccountTriplit() {
  const query = triplit.query('accounts').Where('id', '=', ID);
  const { result: account } = useQueryOne(triplit, query);

  useEffect(() => {
    if (!account) {
      triplit.insert('accounts', { id: ID, name: '' });
    }
  }, [account]);

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!account) {
        throw new Error('Account not found');
      }

      const updatedAccount = { ...accountData, updated_at: new Date() };
      triplit.update('accounts', account.id, updatedAccount);
    },
    [account]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!account) {
        throw new Error('Account not found');
      }

      // TODO: Implement local file storage
      console.log('Triplit uploadFile:', file.name);

      return file.name;
    },
    [account]
  );

  const deleteFile = useCallback(async (path: string) => {
    // For Triplit implementation, this would remove from local storage
    // TODO: Implement local file deletion
    console.log('Triplit deleteFile:', path);
  }, []);

  return {
    user: account as User | undefined,
    account: account as Account | undefined,
    updateAccount,
    uploadFile,
    deleteFile,
  };
}
