import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

import { ChatSchema, MessageSchema } from './types';

export const chatCollection = createCollection(
  localStorageCollectionOptions({
    schema: ChatSchema,
    id: 'chats',
    storageKey: 'app-chats',
    getKey: item => item.id,
  })
);

export const messageCollection = createCollection(
  localStorageCollectionOptions({
    schema: MessageSchema,
    id: 'messages',
    storageKey: 'app-messages',
    getKey: item => item.id,
  })
);
