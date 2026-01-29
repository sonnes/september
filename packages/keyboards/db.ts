import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@september/shared/lib/indexeddb/collection-v2';
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
