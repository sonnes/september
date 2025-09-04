import { useCallback, useEffect, useState } from 'react';

import { useQueryOne } from '@triplit/react';

import { triplit } from '@/triplit/client';
import type { Account, PutAccountData } from '@/types/account';

const defaultAccount: Account = {
  id: 'local-user',
  name: '',
  primary_diagnosis: '',
  year_of_diagnosis: 0,
  medical_document_path: '',
  terms_accepted: false,
  privacy_policy_accepted: false,
  onboarding_completed: false,
  speech_provider: 'browser_tts',
  created_at: new Date(),
  updated_at: new Date(),
};

export function useAccountTriplit() {
  const [account, setAccount] = useState<Account>(defaultAccount);

  const query = triplit.query('accounts').Order('created_at', 'DESC');
  const { result, fetching, error } = useQueryOne(triplit, query);

  useEffect(() => {
    if (!fetching && !result) {
      triplit.insert('accounts', defaultAccount);
    }
  }, [fetching, result]);

  useEffect(() => {
    if (result) {
      setAccount(result as Account);
    }
  }, [result]);

  const putAccount = useCallback(
    async (accountData: PutAccountData) => {
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
      // For Triplit implementation, update local state
      // In a real implementation, this would use Triplit client
      const updatedAccount = { ...account, ...accountData, updated_at: new Date() };
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
    user: account as Account,
    account: account as Account,
    putAccount,
    patchAccount,
    refetch,
    uploadFile,
    deleteFile,
  };
}
