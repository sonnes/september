import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';
import { Account } from './types';

export const accountCollection = createCollection(
  localOnlyCollectionOptions<Account>({
    getKey: (item) => item.id,
  })
);
