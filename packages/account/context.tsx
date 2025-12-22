'use client';

import { ReactNode, createContext, useContext, useEffect, useMemo } from 'react';
import { User } from '@/types/user';
import { Account, PutAccountData } from './types';
import { useDbAccount } from './hooks/use-db-account';
import { useAuth } from './hooks/use-auth';
import { useStorage } from './hooks/use-storage';

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
  user?: User | null;
  account?: Account | null;
  provider?: 'supabase' | 'triplit';
}

export function AccountProvider({
  children,
  user: initialUser,
  account: initialAccount,
}: AccountProviderProps) {
  const { user: authUser, loading: authLoading } = useAuth();

  // Prioritize auth user, then initialUser, then fallback to local-user
  const user = authUser || (initialUser ?? undefined);
  const userId = user?.id || 'local-user';

  const { account: dbAccount, insert, update } = useDbAccount(userId);
  const { uploadFile: supabaseUpload, deleteFile: supabaseDelete } = useStorage();

  useEffect(() => {
    // If we don't have a dbAccount yet, and we are not waiting for auth,
    // initialize the account in TanStack DB.
    if (!dbAccount && !authLoading) {
      // If we have initialAccount data (e.g. from hydration), use it
      if (initialAccount && initialAccount.id === userId) {
        insert(initialAccount);
      } else {
        insert({
          id: userId,
          name: user?.user_metadata?.full_name || 'User',
          created_at: new Date(),
          updated_at: new Date(),
        } as Account);
      }
    }
  }, [dbAccount, authLoading, insert, userId, user, initialAccount]);

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
      account: dbAccount || (initialAccount ?? undefined),
      updateAccount,
      uploadFile,
      deleteFile,
      loading: authLoading || (!dbAccount && !initialAccount),
    }),
    [user, dbAccount, initialAccount, authLoading]
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

