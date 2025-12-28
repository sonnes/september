import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/lib/indexeddb/collection-v2';

import { AccountSchema } from './types';

export const accountCollection = createCollection(
  indexedDBCollectionOptionsV2({
    id: 'user-account',
    kvStoreOptions: {
      dbName: 'app-user-account',
    },
    channelName: 'app-user-account',
    getKey: item => item.id,
    schema: AccountSchema,
  })
);
