'use client';

import { useCallback } from 'react';

import { eq } from '@tanstack/db';
import { createCollection, useLiveQuery } from '@tanstack/react-db';

import { indexedDBCollectionOptionsV2 } from '@september/shared';

import { AccountSchema, type Account } from './schema';

export const accountCollection = createCollection(
  indexedDBCollectionOptionsV2({
    id: 'user-account',
    kvStoreOptions: {
      dbName: 'app-user-account',
    },
    channelName: 'app-user-account',
    getKey: (item: Account) => item.id,
    schema: AccountSchema,
  })
);

export function useAccountStore(accountId: string) {
  const { data, isLoading, isError, status } = useLiveQuery(
    q => q.from({ items: accountCollection }).where(({ items }) => eq(items.id, accountId)),
    [accountId]
  );

  const createAccount = useCallback(async (account: Account) => {
    await accountCollection.insert(account);
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    await accountCollection.update(id, draft => {
      Object.assign(draft, updates);
    });
  }, []);

  return {
    account: data?.[0] as Account | undefined,
    loading: isLoading,
    error: isError ? { message: `Database error: ${status}` } : undefined,
    createAccount,
    updateAccount,
  };
}
