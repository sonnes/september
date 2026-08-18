'use client';

import { useCallback } from 'react';

import { BasicIndex } from '@tanstack/db';
import { createCollection } from '@tanstack/react-db';

import { isDesktopRuntime, putDesktopRecord, useRecordQuery } from '@/packages/shared/lib/data';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';
import { captureLocal } from '@/packages/sync/runtime';

import { type Account, AccountSchema } from './schema';

export const accountCollection = createCollection(
  indexedDBCollectionOptionsV2({
    id: 'user-account',
    kvStoreOptions: {
      dbName: 'app-user-account',
    },
    channelName: 'app-user-account',
    getKey: (item: Account) => item.id,
    schema: AccountSchema,
    onInsert: async ({ transaction }) =>
      captureLocal('user-account', 'upsert', transaction.mutations),
    onUpdate: async ({ transaction }) =>
      captureLocal('user-account', 'upsert', transaction.mutations),
    onDelete: async ({ transaction }) =>
      captureLocal('user-account', 'delete', transaction.mutations),
  })
);

accountCollection.createIndex(row => row.id, { indexType: BasicIndex });

export function useAccountStore(accountId: string) {
  const {
    data: account,
    isLoading,
    error,
  } = useRecordQuery('user-account', accountId, accountCollection, AccountSchema);

  const createAccount = useCallback(async (account: Account) => {
    if (isDesktopRuntime()) {
      await putDesktopRecord('user-account', account.id, account, account.updated_at?.getTime());
      return;
    }
    const tx = accountCollection.insert(account);
    await tx.isPersisted.promise;
  }, []);

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      if (isDesktopRuntime()) {
        if (!account) throw new Error(`Account not found: ${id}`);
        const next = AccountSchema.parse({ ...account, ...updates });
        await putDesktopRecord('user-account', id, next, next.updated_at?.getTime());
        return;
      }
      const tx = accountCollection.update(id, draft => {
        Object.assign(draft, updates);
      });
      await tx.isPersisted.promise;
    },
    [account]
  );

  return {
    account,
    loading: isLoading,
    error,
    createAccount,
    updateAccount,
  };
}
