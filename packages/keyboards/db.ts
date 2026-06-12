import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@september/shared/indexeddb';
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
