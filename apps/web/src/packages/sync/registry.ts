import { accountCollection } from '@/packages/account/account-store';
import { AccountSchema } from '@/packages/account/schema';
import { noteCollection } from '@/packages/notes/db';
import { NoteSchema } from '@/packages/notes/types';
import { messageCollection, savedPhraseCollection, spaceCollection } from '@/packages/spaces/db';
import { MessageSchema, SavedPhraseSchema, SpaceSchema } from '@/packages/spaces/types';

import type { SyncCollection } from './types';

interface AnyCollection {
  id: string;
  utils: { acceptMutations: (tx: unknown) => Promise<void> };
}
interface AnySchema {
  parse: (data: unknown) => unknown;
}

function entry(collection: AnyCollection, schema: AnySchema): SyncCollection {
  return {
    id: collection.id,
    parse: (data) => schema.parse(data),
    // acceptMutations only reads type/key/modified/collection from each item.
    acceptMutations: (tx) => collection.utils.acceptMutations(tx),
  };
}

/** The collections mirrored to the backend (analytics stays local-only). */
export function buildSyncCollections(): Record<string, SyncCollection> {
  return {
    'user-account': entry(accountCollection as unknown as AnyCollection, AccountSchema),
    spaces: entry(spaceCollection as unknown as AnyCollection, SpaceSchema),
    messages: entry(messageCollection as unknown as AnyCollection, MessageSchema),
    'saved-phrases': entry(savedPhraseCollection as unknown as AnyCollection, SavedPhraseSchema),
    documents: entry(noteCollection as unknown as AnyCollection, NoteSchema),
  };
}
