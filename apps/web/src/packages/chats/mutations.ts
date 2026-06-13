import { v4 as uuidv4 } from 'uuid';

import { track } from '@/packages/analytics';

import { chatCollection, messageCollection } from './db';
import type { Chat, CreateMessageData, Message } from './types';

/**
 * Insert a new chat and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createChat(userId: string, title = 'New Chat'): Promise<Chat> {
  const now = new Date();
  const chat: Chat = {
    id: uuidv4(),
    user_id: userId,
    title,
    created_at: now,
    updated_at: now,
  };
  const tx = chatCollection.insert(chat);
  await tx.isPersisted.promise;
  return chat;
}

/**
 * Update a chat by id and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function updateChat(id: string, updates: Partial<Chat>): Promise<void> {
  const tx = chatCollection.update(id, draft => {
    Object.assign(draft, { ...updates, updated_at: new Date() });
  });
  await tx.isPersisted.promise;
}

/**
 * Delete a chat and cascade-delete all its messages, then await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function deleteChat(id: string): Promise<void> {
  // Collect message ids from loaded state before deletion
  const messageIds = messageCollection.toArray
    .filter(m => m.chat_id === id)
    .map(m => m.id);

  const txs = messageIds.map(mid => messageCollection.delete(mid));
  const chatTx = chatCollection.delete(id);

  await Promise.all([...txs.map(t => t.isPersisted.promise), chatTx.isPersisted.promise]);
}

/**
 * Insert a new message, bump the parent chat's updated_at, and fire analytics.
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

  if (data.chat_id) {
    const chatTx = chatCollection.update(data.chat_id, draft => {
      draft.updated_at = now;
    });
    await chatTx.isPersisted.promise;
  }

  track(data.user_id, {
    type: 'message_sent',
    text_length: message.text.length,
    chat_id: message.chat_id,
    keys_typed: editorStats?.keysTyped ?? 0,
  });

  return message;
}
