'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import type { User } from '@/packages/shared';
import { useOptimisticRecordMutation } from '@/packages/shared/lib/data';

import { useAccountStore } from './account-store';
import { createDefaultAccount } from './defaults';
import { type Account, AccountSchema, type AccountUpdate } from './schema';
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

  const { mutateAsync: mutateAccount } = useOptimisticRecordMutation<void, AccountUpdate, Account>({
    queryKey: ['account', user.id],
    mutationFn: updates =>
      updateStoredAccount(user.id, {
        ...updates,
        updated_at: new Date(),
      }),
    update: (current, updates) =>
      AccountSchema.parse({ ...current, ...updates, updated_at: new Date() }),
  });

  const updateAccount = useCallback(
    (updates: AccountUpdate) => mutateAccount(updates),
    [mutateAccount]
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
