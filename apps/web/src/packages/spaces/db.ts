import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';
import { captureLocal } from '@/packages/sync/runtime';

import { SpaceSchema, MessageSchema, SavedPhraseSchema } from './types';

export const spaceCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: SpaceSchema,
    id: 'spaces',
    kvStoreOptions: {
      dbName: 'app-spaces',
    },
    channelName: 'app-spaces',
    getKey: item => item.id,
    onInsert: async ({ transaction }) => captureLocal('spaces', 'upsert', transaction.mutations),
    onUpdate: async ({ transaction }) => captureLocal('spaces', 'upsert', transaction.mutations),
    onDelete: async ({ transaction }) => captureLocal('spaces', 'delete', transaction.mutations),
  })
);

export const messageCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: MessageSchema,
    id: 'messages',
    kvStoreOptions: {
      dbName: 'app-messages',
    },
    channelName: 'app-messages',
    getKey: item => item.id,
    onInsert: async ({ transaction }) => captureLocal('messages', 'upsert', transaction.mutations),
    onUpdate: async ({ transaction }) => captureLocal('messages', 'upsert', transaction.mutations),
    onDelete: async ({ transaction }) => captureLocal('messages', 'delete', transaction.mutations),
  })
);

export const savedPhraseCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: SavedPhraseSchema,
    id: 'saved-phrases',
    kvStoreOptions: {
      dbName: 'app-saved-phrases',
    },
    channelName: 'app-saved-phrases',
    getKey: item => item.id,
    onInsert: async ({ transaction }) => captureLocal('saved-phrases', 'upsert', transaction.mutations),
    onUpdate: async ({ transaction }) => captureLocal('saved-phrases', 'upsert', transaction.mutations),
    onDelete: async ({ transaction }) => captureLocal('saved-phrases', 'delete', transaction.mutations),
  })
);
