'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { User } from '@september/shared/types/user';

import { useAuth } from './hooks/use-auth';
import { useDbAccount } from './hooks/use-db-account';
import { Account, PutAccountData } from './types';

export interface AccountContextType {
  user?: User;
  account?: Account;
  updateAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
  loading: boolean;
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface AccountProviderProps {
  children: ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { user, loading: authLoading } = useAuth();

  const userId = useMemo(() => user?.id ?? 'local-user', [user]);

  const { account: dbAccount, isLoading, insert, update } = useDbAccount(userId);

  useEffect(() => {
    if (!dbAccount && !authLoading && !isLoading) {
      insert({
        id: userId,
        name: user?.user_metadata?.full_name ?? 'Guest',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }, [dbAccount, authLoading, insert, userId, user]);

  const updateAccount = useCallback(
    async (accountData: Partial<PutAccountData>) => {
      await update(userId, { ...accountData, updated_at: new Date() });
    },
    [update, userId]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      return file.name;
    },
    []
  );

  const deleteFile = useCallback(
    async (_path: string) => {
      // No-op: file storage is handled locally
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      account: dbAccount,
      updateAccount,
      uploadFile,
      deleteFile,
      loading: authLoading || !dbAccount,
    }),
    [user, dbAccount, authLoading, updateAccount, uploadFile, deleteFile]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
