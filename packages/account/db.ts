import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

import { AccountSchema } from './types';

export const accountCollection = createCollection(
  localStorageCollectionOptions({
    id: 'user-account',
    storageKey: 'app-user-account',
    getKey: item => item.id,
    schema: AccountSchema,
  })
);
