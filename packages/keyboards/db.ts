import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptions } from '@/lib/indexeddb/collection';
import { CustomKeyboard, CustomKeyboardSchema } from './types';

export const customKeyboardCollection = createCollection(
  indexedDBCollectionOptions<CustomKeyboard>({
    schema: CustomKeyboardSchema,
    id: 'custom-keyboards',
    kvStoreOptions: {
      dbName: 'app-custom-keyboards',
    },
    channelName: 'app-custom-keyboards',
    getKey: item => item.id,
  })
);
