import { createCollection } from '@tanstack/react-db';

import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

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
  })
);
