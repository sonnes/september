'use client';

import { ReactNode, createContext, useContext } from 'react';

import { User } from '@supabase/supabase-js';

import { useAccount } from '@/hooks/use-account';
import type { Account, PutAccountData } from '@/types/account';

interface AccountContextType {
  user?: User;
  account?: Account;
  putAccount: (accountData: PutAccountData) => Promise<void>;
  patchAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
  refetch: () => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

interface AccountProviderProps {
  user?: User;
  account?: Account;
  children: ReactNode;
}

export function AccountProvider({ user, account, children }: AccountProviderProps) {
  const accountData = useAccount({ user, account });

  return <AccountContext.Provider value={accountData}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
