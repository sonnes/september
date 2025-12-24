import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptions } from '@/lib/indexeddb/collection';

import { ChatSchema, MessageSchema, Chat, Message } from './types';

export const chatCollection = createCollection(
  indexedDBCollectionOptions<Chat>({
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
  indexedDBCollectionOptions<Message>({
    schema: MessageSchema,
    id: 'messages',
    kvStoreOptions: {
      dbName: 'app-messages',
    },
    channelName: 'app-messages',
    getKey: item => item.id,
  })
);
