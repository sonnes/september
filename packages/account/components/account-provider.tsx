'use client';

import { ReactNode, createContext, useContext } from 'react';
import { User } from '@/types/user';
import { Account, PutAccountData } from '../types';
import { useAccountSupabase } from '../hooks/use-db-account-supabase';
import { useAccountTriplit } from '../hooks/use-db-account-triplit';

export interface AccountContextType {
  user?: User;
  account?: Account;
  updateAccount: (accountData: Partial<PutAccountData>) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
  loading: boolean;
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined);

type AccountProviderProps =
  | {
      provider: 'supabase';
      user?: User;
      account?: Account;
      children: ReactNode;
    }
  | {
      provider?: 'triplit';
      children: ReactNode;
    };

export function AccountProvider(props: AccountProviderProps) {
  const { provider = 'triplit' } = props;
  
  const supabaseData = useAccountSupabase(
    provider === 'supabase'
      ? { user: (props as any).user, account: (props as any).account }
      : { user: undefined, account: undefined }
  );
  const triplitData = useAccountTriplit();

  const accountData: AccountContextType =
    provider === 'supabase' ? supabaseData : triplitData;

  return <AccountContext.Provider value={accountData}>{props.children}</AccountContext.Provider>;
}

