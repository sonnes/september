'use client';

import { useCallback, useState } from 'react';

import { toast } from 'sonner';

import { customKeyboardCollection } from '../db';
import { CustomKeyboard, UpdateCustomKeyboardData } from '../types';

export interface UseUpdateKeyboardReturn {
  updateKeyboard: (id: string, updates: UpdateCustomKeyboardData) => Promise<CustomKeyboard>;
  isUpdating: boolean;
}

export function useUpdateKeyboard(): UseUpdateKeyboardReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateKeyboard = useCallback(async (id: string, updates: UpdateCustomKeyboardData) => {
    setIsUpdating(true);
    try {
      let updatedKeyboard: CustomKeyboard | undefined;
      await customKeyboardCollection.update(id, draft => {
        Object.assign(draft, {
          ...updates,
          updated_at: new Date(),
        });
        updatedKeyboard = JSON.parse(JSON.stringify(draft)); // Get a copy of the updated state
      });

      if (!updatedKeyboard) {
        throw new Error('Failed to retrieve updated keyboard');
      }

      toast.success('Keyboard updated');
      return updatedKeyboard;
    } catch (err) {
      console.error('Failed to update keyboard:', err);
      toast.error('Failed to update keyboard');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { updateKeyboard, isUpdating };
}
