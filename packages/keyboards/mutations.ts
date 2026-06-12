import { nanoid } from 'nanoid';

import { customKeyboardCollection } from './db';
import type { CreateCustomKeyboardData, CustomKeyboard, UpdateCustomKeyboardData } from './types';

/**
 * Insert a new custom keyboard and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createKeyboard(data: CreateCustomKeyboardData): Promise<CustomKeyboard> {
  const now = new Date();
  const keyboardId = data.id || nanoid();

  const buttons = data.buttons.map((btn, index) => ({
    id: nanoid(),
    text: btn.text,
    value: btn.value,
    image_url: btn.image_url,
    order: index,
  }));

  const keyboard: CustomKeyboard = {
    id: keyboardId,
    user_id: data.user_id,
    name: data.name,
    buttons,
    chat_id: data.chat_id,
    columns: data.columns ?? 4,
    created_at: data.created_at ?? now,
    updated_at: now,
  };

  const tx = customKeyboardCollection.insert(keyboard);
  await tx.isPersisted.promise;
  return keyboard;
}

/**
 * Update a custom keyboard by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateKeyboard(
  id: string,
  updates: UpdateCustomKeyboardData
): Promise<CustomKeyboard> {
  let updatedKeyboard: CustomKeyboard | undefined;

  const tx = customKeyboardCollection.update(id, draft => {
    Object.assign(draft, {
      ...updates,
      updated_at: new Date(),
    });
    // Capture a shallow copy of the draft (Date objects preserved, unlike JSON.parse)
    updatedKeyboard = { ...(draft as unknown as CustomKeyboard) };
  });

  await tx.isPersisted.promise;

  if (!updatedKeyboard) {
    throw new Error('Failed to retrieve updated keyboard');
  }

  return updatedKeyboard;
}

/**
 * Delete a custom keyboard by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteKeyboard(id: string): Promise<void> {
  const tx = customKeyboardCollection.delete(id);
  await tx.isPersisted.promise;
}
