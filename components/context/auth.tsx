'use client';

import { createContext, useContext, useState } from 'react';

import { Account } from '@/supabase/types';

export interface AuthUser {
  id: string;
  email: string;
}

type AuthContext = {
  user?: AuthUser;
};

const AuthContext = createContext<AuthContext | undefined>(undefined);

export const AuthProvider = ({
  user,
  children,
}: {
  user?: AuthUser;
  children: React.ReactNode;
}) => {
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(`useAuth must be used within a Auth Context Provider.`);
  }
  return context;
};

type AccountContext = {
  account: Account;
  setAccount: (account: Account) => void;
};

const AccountContext = createContext<AccountContext | undefined>(undefined);

export const AccountProvider = ({
  account: initialAccount,
  children,
}: {
  account: Account;
  children: React.ReactNode;
}) => {
  const [account, setAccount] = useState<Account>(initialAccount);

  return (
    <AccountContext.Provider value={{ account, setAccount }}>{children}</AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error(`useAccount must be used within a Account Context Provider.`);
  }
  return context;
};
