import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

import { DocumentSchema } from './types';

export const documentCollection = createCollection(
  localStorageCollectionOptions({
    schema: DocumentSchema,
    id: 'documents',
    storageKey: 'app-documents',
    getKey: item => item.id,
  })
);
