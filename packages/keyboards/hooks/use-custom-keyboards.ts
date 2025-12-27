import { useMemo } from 'react';

import { eq, isNull } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { customKeyboardCollection } from '../db';
import { CustomKeyboard } from '../types';

export interface UseCustomKeyboardsReturn {
  keyboards: CustomKeyboard[];
  isLoading: boolean;
  error?: { message: string };
}

export function useCustomKeyboards({ chatId }: { chatId?: string } = {}): UseCustomKeyboardsReturn {
  const {
    data: keyboards,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: customKeyboardCollection });
      if (chatId) {
        query = query.where(({ items }) => eq(items.chat_id, chatId));
      } else {
        query = query.where(({ items }) => isNull(items.chat_id));
      }
      return query.orderBy(({ items }) => items.created_at, 'desc');
    },
    [chatId]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    keyboards: (keyboards || []) as CustomKeyboard[],
    isLoading,
    error,
  };
}
