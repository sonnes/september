import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';
import { CustomKeyboardSchema } from './types';

export const customKeyboardCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: CustomKeyboardSchema,
    id: 'custom-keyboards',
    kvStoreOptions: {
      dbName: 'app-custom-keyboards',
    },
    channelName: 'app-custom-keyboards',
    getKey: item => item.id,
  })
);
