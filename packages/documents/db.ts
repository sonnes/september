import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptions } from '@/lib/indexeddb/collection';

import { DocumentSchema, Document } from './types';

export const documentCollection = createCollection(
  indexedDBCollectionOptions<Document>({
    schema: DocumentSchema,
    id: 'documents',
    kvStoreOptions: {
      dbName: 'app-documents',
    },
    channelName: 'app-documents',
    getKey: item => item.id,
  })
);
