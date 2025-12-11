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
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) return;
    // Fetch initial user
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user ?? undefined);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(undefined);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  const triplitData = useAccountTriplit();
  const supabaseData = useAccountSupabase(user);

  // Use Supabase if user is authenticated, otherwise use Triplit
  const accountData = useMemo(
    () => (user && !loading ? supabaseData : triplitData),
    [user, loading, supabaseData, triplitData]
  );

  return (
    <AccountContext.Provider value={{ loading, user, ...accountData }}>
      {props.children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccountContext must be used within an AccountProvider');
  }
  return context;
}
