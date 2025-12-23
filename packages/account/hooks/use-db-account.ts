'use client';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { accountCollection } from '../db';
import { Account, CreateAccountData, PutAccountData } from '../types';

export function useDbAccount(id?: string) {
  const { data: account, isLoading } = useLiveQuery(
    q => {
      let query = q.from({ items: accountCollection });
      if (id) {
        query = query.where(({ items }) => eq(items.id, id));
      }
      return query;
    },
    [id]
  );

  return {
    account: account?.[0] as Account | undefined,
    isLoading,
    insert: (item: CreateAccountData) => accountCollection.insert(item as Account),
    update: (id: string, updates: PutAccountData) =>
      accountCollection.update(id, draft => {
        Object.assign(draft, updates);
      }),
    delete: (id: string) => accountCollection.delete(id),
  };
}
