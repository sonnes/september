'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';

import type { User } from '@/packages/shared';

import { useAccountStore } from './account-store';
import { createDefaultAccount } from './defaults';
import type { Account, AccountUpdate } from './schema';
import { useCurrentUser } from './use-current-user';

interface AccountContextValue {
  user: User;
  account?: Account;
  loading: boolean;
  updateAccount: (updates: AccountUpdate) => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    account,
    loading: accountLoading,
    createAccount,
    updateAccount: updateStoredAccount,
  } = useAccountStore(user.id);

  useEffect(() => {
    if (userLoading || accountLoading || account) return;

    createAccount(createDefaultAccount(user)).catch(error => {
      console.error('Failed to initialize account:', error);
    });
  }, [account, accountLoading, createAccount, user, userLoading]);

  const updateAccount = useCallback(
    async (updates: AccountUpdate) => {
      await updateStoredAccount(user.id, {
        ...updates,
        updated_at: new Date(),
      });
    },
    [updateStoredAccount, user.id]
  );

  const value = useMemo(
    () => ({
      user,
      account,
      loading: userLoading || accountLoading || !account,
      updateAccount,
    }),
    [account, accountLoading, updateAccount, user, userLoading]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }

  return context;
}
