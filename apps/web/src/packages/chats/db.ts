import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

import { ChatSchema, MessageSchema } from './types';

export const chatCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: ChatSchema,
    id: 'chats',
    kvStoreOptions: {
      dbName: 'app-chats',
    },
    channelName: 'app-chats',
    getKey: item => item.id,
  })
);

export const messageCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: MessageSchema,
    id: 'messages',
    kvStoreOptions: {
      dbName: 'app-messages',
    },
    channelName: 'app-messages',
    getKey: item => item.id,
  })
);
