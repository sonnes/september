import { BasicIndex } from '@tanstack/db';
import { createCollection } from '@tanstack/react-db';

import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';
import { captureLocal } from '@/packages/sync/runtime';

import { NoteSchema } from './types';

export const noteCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: NoteSchema,
    // Keep legacy storage IDs so existing local notes survive the rename.
    id: 'documents',
    kvStoreOptions: {
      dbName: 'app-documents',
    },
    channelName: 'app-documents',
    getKey: item => item.id,
    onInsert: async ({ transaction }) => captureLocal('documents', 'upsert', transaction.mutations),
    onUpdate: async ({ transaction }) => captureLocal('documents', 'upsert', transaction.mutations),
    onDelete: async ({ transaction }) => captureLocal('documents', 'delete', transaction.mutations),
  })
);

noteCollection.createIndex(row => row.id, { indexType: BasicIndex });
noteCollection.createIndex(row => row.space_id, { indexType: BasicIndex });
noteCollection.createIndex(row => row.updated_at, { indexType: BasicIndex });
