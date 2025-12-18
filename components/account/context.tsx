'use client';

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';

import supabase from '@/supabase/client';
import type { Account, PutAccountData } from '@/types/account';
import type { User } from '@/types/user';

import { useAccountSupabase } from './use-supabase';
import { useAccountTriplit } from './use-triplit';

interface AccountContextType {
  loading: boolean;
  user?: User;
  account?: Account;
  updateAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

type AccountProviderProps = {
  children: ReactNode;
};

export function AccountProvider(props: AccountProviderProps) {
  const triplitData = useAccountTriplit();

  return <AccountContext.Provider value={triplitData}>{props.children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
