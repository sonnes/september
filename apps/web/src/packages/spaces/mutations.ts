import { v4 as uuidv4 } from 'uuid';

import { deleteNotesForSpace } from '@/packages/notes';
import { track } from '@/packages/usage';

import { messageCollection, savedPhraseCollection, spaceCollection } from './db';
import { dedupeAgainstPinned } from './lib/phrases';
import type { CreateMessageData, Message, Space } from './types';

export const DEFAULT_SPACE_TITLE = 'General';
export const DEFAULT_SPACE_SEED = {
  title: DEFAULT_SPACE_TITLE,
  phrases: [
    { text: 'Hello', pinned: true, demoSource: 'md' },
    { text: 'Please', pinned: true, demoSource: 'md' },
    { text: 'Thank you', pinned: true, demoSource: 'md' },
    { text: 'Help', pinned: true, demoSource: 'md' },
    { text: 'Good morning', pinned: false, demoSource: 'md' },
    { text: 'Yes, please.', pinned: false, demoSource: 'history' },
    { text: 'No, thank you.', pinned: false, demoSource: 'llm' },
  ],
} as const;

/**
 * Insert a new space and await persistence.
 * Throws on failure — toast lives at the call site.
 */
export async function createSpace(userId: string, title = DEFAULT_SPACE_TITLE): Promise<Space> {
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
 * Insert the first-run default space plus its starter saved phrases.
 * Throws on failure — toast lives at the call site.
 */
export async function createDefaultSpace(userId: string): Promise<Space> {
  const space = await createSpace(userId, DEFAULT_SPACE_SEED.title);
  const now = new Date();
  const phraseTxs = DEFAULT_SPACE_SEED.phrases.map((phrase, index) =>
    savedPhraseCollection.insert({
      id: uuidv4(),
      space_id: space.id,
      user_id: userId,
      text: phrase.text,
      pinned: phrase.pinned,
      created_at: new Date(now.getTime() + index),
    })
  );

  await Promise.all(phraseTxs.map(tx => tx.isPersisted.promise));
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
 * Delete a space and cascade-delete all its messages, saved phrases, and notes,
 * then await persistence. Throws on failure — toast lives at the call site.
 */
export async function deleteSpace(id: string): Promise<void> {
  // Collect message + phrase ids from loaded state before deletion
  const messageIds = messageCollection.toArray.filter(m => m.space_id === id).map(m => m.id);
  const phraseIds = savedPhraseCollection.toArray.filter(p => p.space_id === id).map(p => p.id);

  const txs = messageIds.map(mid => messageCollection.delete(mid));
  const phraseTxs = phraseIds.map(pid => savedPhraseCollection.delete(pid));
  const spaceTx = spaceCollection.delete(id);

  await Promise.all([
    ...txs.map(t => t.isPersisted.promise),
    ...phraseTxs.map(t => t.isPersisted.promise),
    deleteNotesForSpace(id),
    spaceTx.isPersisted.promise,
  ]);
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

// ---------------------------------------------------------------------------
// Saved phrases — one collection, one `pinned` flag (the AI/manual distinction).
// Regeneration only ever rewrites AI rows; pinned rows are never touched.
// ---------------------------------------------------------------------------

/**
 * Add a phrase the user wants to keep. Upsert: if the space already has this
 * text (case-insensitive), pin it (promotes an AI phrase so regen can't drop
 * it); otherwise insert a new pinned row. No-op on blank text.
 */
export async function addManualPhrase(
  spaceId: string,
  userId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();

  const existing = savedPhraseCollection.toArray.find(
    p => p.space_id === spaceId && p.text.trim().toLowerCase() === key
  );

  if (existing) {
    if (!existing.pinned) {
      const tx = savedPhraseCollection.update(existing.id, draft => {
        draft.pinned = true;
      });
      await tx.isPersisted.promise;
    }
    return;
  }

  const tx = savedPhraseCollection.insert({
    id: uuidv4(),
    space_id: spaceId,
    user_id: userId,
    text: trimmed,
    pinned: true,
    created_at: new Date(),
  });
  await tx.isPersisted.promise;
}

/** Delete a saved phrase by id. */
export async function removePhrase(phraseId: string): Promise<void> {
  const tx = savedPhraseCollection.delete(phraseId);
  await tx.isPersisted.promise;
}

/** Toggle a phrase's pinned flag. Unpinning makes it regenerable again. */
export async function setPhrasePinned(phraseId: string, pinned: boolean): Promise<void> {
  const tx = savedPhraseCollection.update(phraseId, draft => {
    draft.pinned = pinned;
  });
  await tx.isPersisted.promise;
}

/**
 * The seed/regen write. Replace the space's AI phrases with a fresh set: delete
 * every `pinned: false` row, insert the AI texts that don't duplicate a pinned
 * phrase, and record `phrases_synced_count`. Pinned rows are never touched.
 */
export async function replaceAiPhrases(
  spaceId: string,
  userId: string,
  aiTexts: string[],
  syncedCount: number
): Promise<void> {
  const rows = savedPhraseCollection.toArray.filter(p => p.space_id === spaceId);
  const pinnedTexts = rows.filter(p => p.pinned).map(p => p.text);
  const oldAiIds = rows.filter(p => !p.pinned).map(p => p.id);
  const fresh = dedupeAgainstPinned(pinnedTexts, aiTexts);

  const now = new Date();
  const deletes = oldAiIds.map(id => savedPhraseCollection.delete(id));
  const inserts = fresh.map(text =>
    savedPhraseCollection.insert({
      id: uuidv4(),
      space_id: spaceId,
      user_id: userId,
      text,
      pinned: false,
      created_at: now,
    })
  );

  await Promise.all([...deletes, ...inserts].map(t => t.isPersisted.promise));
  await updateSpace(spaceId, { phrases_synced_count: syncedCount });
}
