'use client';

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { useAccountContext } from '@/packages/account';
import { customKeyboardCollection } from '../db';
import { CreateCustomKeyboardData, CustomKeyboard } from '../types';

export interface UseCreateKeyboardReturn {
  createKeyboard: (data: CreateCustomKeyboardData) => Promise<CustomKeyboard>;
  isCreating: boolean;
}

export function useCreateKeyboard(): UseCreateKeyboardReturn {
  const { user } = useAccountContext();
  const [isCreating, setIsCreating] = useState(false);

  const createKeyboard = useCallback(
    async (data: CreateCustomKeyboardData) => {
      setIsCreating(true);
      try {
        const now = new Date();
        const keyboardId = data.id || nanoid();

        // Assign order to buttons if not present
        const buttons = data.buttons.map((btn, index) => ({
          id: nanoid(),
          text: btn.text,
          value: btn.value,
          image_url: btn.image_url,
          order: index,
        }));

        const newKeyboard: CustomKeyboard = {
          id: keyboardId,
          user_id: data.user_id || user?.id || '',
          name: data.name,
          buttons,
          chat_id: data.chat_id,
          columns: data.columns || 3,
          created_at: data.created_at || now,
          updated_at: now,
        };

        await customKeyboardCollection.insert(newKeyboard);
        toast.success('Keyboard created');
        return newKeyboard;
      } catch (err) {
        console.error('Failed to create keyboard:', err);
        toast.error('Failed to create keyboard');
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [user]
  );

  return { createKeyboard, isCreating };
}
