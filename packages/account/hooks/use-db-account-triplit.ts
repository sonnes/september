import { useCallback, useEffect } from 'react';
import { useQueryOne } from '@triplit/react';
import { triplit } from '@/triplit/client';
import { Account, PutAccountData } from '../types';
import { User } from '@/types/user';

const LOCAL_USER_ID = 'local-user';

export function useAccountTriplit() {
  const query = triplit.query('accounts').Where('id', '=', LOCAL_USER_ID);
  const { result: account, fetching: loading } = useQueryOne(triplit, query);

  useEffect(() => {
    if (!account && !loading) {
      triplit.insert('accounts', { id: LOCAL_USER_ID, name: 'Local User' });
    }
  }, [account, loading]);

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      if (!account) {
        throw new Error('Account not found');
      }

      const updatedAccount = { ...accountData, updated_at: new Date() };
      // @ts-ignore - Triplit types might be strict
      triplit.update('accounts', account.id, updatedAccount);
    },
    [account]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      // Local implementation would save to IndexedDB or filesystem
      console.log('Triplit uploadFile (not implemented):', file.name);
      return file.name;
    },
    []
  );

  const deleteFile = useCallback(async (path: string) => {
    console.log('Triplit deleteFile (not implemented):', path);
  }, []);

  return {
    user: { id: account?.id || LOCAL_USER_ID, email: 'local@device' } as User,
    account: account as Account,
    updateAccount,
    uploadFile,
    deleteFile,
    loading,
  };
}

