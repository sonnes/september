import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

import { DocumentSchema } from './types';

export const documentCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: DocumentSchema,
    id: 'documents',
    kvStoreOptions: {
      dbName: 'app-documents',
    },
    channelName: 'app-documents',
    getKey: item => item.id,
  })
);
