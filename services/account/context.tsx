'use client';

import { ReactNode, createContext, useContext } from 'react';

import type { Account, PutAccountData } from '@/types/account';
import type { User } from '@/types/user';

import { useAccountSupabase } from './use-supabase';
import { useAccountTriplit } from './use-triplit';

interface AccountContextType {
  user: User;
  account: Account;
  putAccount: (accountData: PutAccountData) => Promise<void>;
  patchAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
  refetch: () => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

type AccountProviderProps =
  | {
      provider: 'supabase';
      user: User;
      account: Account;
      children: ReactNode;
    }
  | {
      provider: 'triplit';
      children: ReactNode;
    };

export function AccountProvider(props: AccountProviderProps) {
  const accountData =
    props.provider === 'supabase'
      ? useAccountSupabase({ user: props.user, account: props.account })
      : useAccountTriplit();

  return <AccountContext.Provider value={accountData}>{props.children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
