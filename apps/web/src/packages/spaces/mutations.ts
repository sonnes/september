import { v4 as uuidv4 } from 'uuid';

import { track } from '@/packages/usage';

import { spaceCollection, messageCollection } from './db';
import type { Space, CreateMessageData, Message } from './types';

/**
 * Insert a new space and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createSpace(userId: string, title = 'New Space'): Promise<Space> {
  const now = new Date();
  const space: Space = {
    id: uuidv4(),
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };
  const tx = spaceCollection.insert(space);
  await tx.isPersisted.promise;
  return space;
}

/**
 * Update a space by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateSpace(id: string, updates: Partial<Space>): Promise<void> {
  const tx = spaceCollection.update(id, draft => {
    Object.assign(draft, { ...updates, updated_at: new Date() });
  });
  await tx.isPersisted.promise;
}

/**
 * Delete a space and cascade-delete all its messages, then await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteSpace(id: string): Promise<void> {
  // Collect message ids from loaded state before deletion
  const messageIds = messageCollection.toArray
    .filter(m => m.space_id === id)
    .map(m => m.id);

  const txs = messageIds.map(mid => messageCollection.delete(mid));
  const spaceTx = spaceCollection.delete(id);

  await Promise.all([...txs.map(t => t.isPersisted.promise), spaceTx.isPersisted.promise]);
}

/**
 * Insert a new message, bump the parent space's updated_at, and fire analytics.
 * Throws on failure — toast lives at the call site.
 */
export async function createMessage(data: CreateMessageData): Promise<Message> {
  const now = new Date();
  // editorStats is transient input for analytics — never persisted
  const { editorStats, ...fields } = data;
  const message: Message = {
    ...fields,
    id: data.id ?? uuidv4(),
    created_at: data.created_at ?? now,
  };

  const tx = messageCollection.insert(message);
  await tx.isPersisted.promise;

  if (data.space_id) {
    const spaceTx = spaceCollection.update(data.space_id, draft => {
      draft.updated_at = now;
    });
    await spaceTx.isPersisted.promise;
  }

  track(data.user_id, {
    type: 'message_sent',
    text_length: message.text.length,
    space_id: message.space_id,
    keys_typed: editorStats?.keysTyped ?? 0,
  });

  return message;
}
