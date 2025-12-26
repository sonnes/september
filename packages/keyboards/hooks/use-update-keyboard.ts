'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { customKeyboardCollection } from '../db';
import { UpdateCustomKeyboardData } from '../types';

export interface UseUpdateKeyboardReturn {
  updateKeyboard: (id: string, updates: UpdateCustomKeyboardData) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateKeyboard(): UseUpdateKeyboardReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateKeyboard = useCallback(
    async (id: string, updates: UpdateCustomKeyboardData) => {
      setIsUpdating(true);
      try {
        await customKeyboardCollection.update(id, draft => {
          Object.assign(draft, {
            ...updates,
            updated_at: new Date(),
          });
        });
        toast.success('Keyboard updated');
      } catch (err) {
        console.error('Failed to update keyboard:', err);
        toast.error('Failed to update keyboard');
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return { updateKeyboard, isUpdating };
}
