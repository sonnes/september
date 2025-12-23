'use client';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { toast } from 'sonner';

import { accountCollection } from '../db';
import { Account, CreateAccountData, PutAccountData } from '../types';

export interface UseDbAccountReturn {
  account: Account | undefined;
  isLoading: boolean;
  error?: { message: string };
  insert: (item: CreateAccountData) => Promise<void>;
  update: (id: string, updates: PutAccountData) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export function useDbAccount(id?: string): UseDbAccountReturn {
  const {
    data: account,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: accountCollection });
      if (id) {
        query = query.where(({ items }) => eq(items.id, id));
      }
      return query;
    },
    [id]
  );

  const insert = async (item: CreateAccountData) => {
    try {
      await accountCollection.insert(item as Account);
    } catch (err) {
      console.error('Failed to insert account:', err);
      toast.error('Failed to initialize account');
      throw err;
    }
  };

  const update = async (id: string, updates: PutAccountData) => {
    try {
      await accountCollection.update(id, draft => {
        Object.assign(draft, updates);
      });
      toast.success('Account updated');
    } catch (err) {
      console.error('Failed to update account:', err);
      toast.error('Failed to update account');
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await accountCollection.delete(id);
      toast.success('Account deleted');
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error('Failed to delete account');
      throw err;
    }
  };

  return {
    account: account?.[0] as Account | undefined,
    isLoading,
    error: isError ? { message: `Database error: ${status}` } : undefined,
    insert,
    update,
    delete: remove,
  };
}
