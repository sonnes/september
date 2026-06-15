import { createCollection } from '@tanstack/react-db';
import { indexedDBCollectionOptionsV2 } from '@/packages/shared/lib/indexeddb';

import { SpaceSchema, MessageSchema, SavedPhraseSchema } from './types';

export const spaceCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: SpaceSchema,
    id: 'spaces',
    kvStoreOptions: {
      dbName: 'app-spaces',
    },
    channelName: 'app-spaces',
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

export const savedPhraseCollection = createCollection(
  indexedDBCollectionOptionsV2({
    schema: SavedPhraseSchema,
    id: 'saved-phrases',
    kvStoreOptions: {
      dbName: 'app-saved-phrases',
    },
    channelName: 'app-saved-phrases',
    getKey: item => item.id,
  })
);
