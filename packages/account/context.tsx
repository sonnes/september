'use client';

import { ReactNode, createContext, useContext, useEffect, useMemo } from 'react';

import { User } from '@/types/user';

import { useAuth } from './hooks/use-auth';
import { useDbAccount } from './hooks/use-db-account';
import { useStorage } from './hooks/use-storage';
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

  const { account: dbAccount, insert, update } = useDbAccount(userId);
  const { uploadFile: supabaseUpload, deleteFile: supabaseDelete } = useStorage();

  useEffect(() => {
    // If we don't have a dbAccount yet, and we are not waiting for auth,
    // initialize the account in TanStack DB.
    if (!dbAccount && !authLoading) {
      insert({
        id: userId,
        name: user?.user_metadata?.full_name ?? 'Guest',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }, [dbAccount, authLoading, insert, userId, user]);

  const updateAccount = async (accountData: Partial<PutAccountData>) => {
    await update(userId, { ...accountData, updated_at: new Date() });
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      console.log('Upload skipped: user not authenticated');
      return file.name;
    }
    return supabaseUpload(user.id, file);
  };

  const deleteFile = async (path: string) => {
    await supabaseDelete(path);
  };

  const value = useMemo(
    () => ({
      user,
      account: dbAccount,
      updateAccount,
      uploadFile,
      deleteFile,
      loading: authLoading || !dbAccount,
    }),
    [user, dbAccount, authLoading]
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
