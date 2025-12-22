'use client';

import { ReactNode, createContext, useContext } from 'react';

import type { Account, PutAccountData } from '@/types/account';
import type { User } from '@/types/user';

import { useAccountSupabase } from './use-supabase';
import { useAccountTriplit } from './use-triplit';

interface AccountContextType {
  user: User;
  account: Account;
  updateAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
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
  // Call all hooks unconditionally to satisfy React Hooks rules
  // When provider is 'supabase', we have user and account from props
  // When provider is 'triplit', we pass undefined but won't use the result
  const supabaseData = useAccountSupabase(
    props.provider === 'supabase' 
      ? { user: props.user, account: props.account }
      : { user: undefined, account: undefined }
  );
  const triplitData = useAccountTriplit();

  // Use the appropriate data based on provider
  // TypeScript needs help here because it doesn't know that when provider is 'supabase',
  // supabaseData will have valid user and account
  const accountData: AccountContextType = props.provider === 'supabase' 
    ? (supabaseData as AccountContextType)
    : triplitData;

  return <AccountContext.Provider value={accountData}>{props.children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
