import { useMemo } from 'react';

import { eq, isNull, isUndefined, or } from '@tanstack/db';
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
      const query = q
        .from({ items: customKeyboardCollection })
        .where(({ items }) =>
          chatId && chatId !== ''
            ? or(isNull(items.chat_id), isUndefined(items.chat_id), eq(items.chat_id, chatId))
            : or(isNull(items.chat_id), isUndefined(items.chat_id), eq(items.chat_id, ''))
        );
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
