import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptions } from '@/lib/indexeddb/collection';

import { AccountSchema, Account } from './types';

export const accountCollection = createCollection(
  indexedDBCollectionOptions<Account>({
    id: 'user-account',
    kvStoreOptions: {
      dbName: 'app-user-account',
    },
    channelName: 'app-user-account',
    getKey: item => item.id,
    schema: AccountSchema,
  })
);
