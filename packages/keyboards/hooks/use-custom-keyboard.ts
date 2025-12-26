import { useMemo } from 'react';

import { eq } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';

import { customKeyboardCollection } from '../db';
import { CustomKeyboard } from '../types';

export interface UseCustomKeyboardReturn {
  keyboard: CustomKeyboard | undefined;
  isLoading: boolean;
  error?: { message: string };
}

export function useCustomKeyboard(id?: string): UseCustomKeyboardReturn {
  const {
    data: keyboard,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      return q
        .from({ items: customKeyboardCollection })
        .where(({ items }) => eq(items.id, id || ''));
    },
    [id]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  return {
    keyboard: keyboard?.[0] as CustomKeyboard | undefined,
    isLoading,
    error,
  };
}
