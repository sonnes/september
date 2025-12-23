# Migration Plan: Chats Package to TanStack DB

This document outlines the steps to migrate the `packages/chats/` module from Triplit to TanStack DB. Following the project architecture, Supabase is restricted to Authentication and File Storage only. Chat and message data will be stored locally using TanStack DB.

## Overview

We are moving chat and message data entirely to TanStack DB.

- **TanStack DB**: Primary store for chats and messages (local-first).
- **Supabase**: Not used for chat/message data. Used only for Auth (user context).
- **Triplit**: Completely removed.

## Step-by-Step Migration

### 1. Define Zod Schemas

Create or update Zod schemas in `packages/chats/types/` to be used with TanStack DB.

- `ChatSchema`: `id` (uuid), `user_id`, `title`, `created_at`, `updated_at`.
- `MessageSchema`: `id` (uuid), `text`, `type`, `user_id`, `chat_id`, `audio_path`, `created_at`.

### 2. Initialize TanStack DB Collections

Create `packages/chats/db.ts`:

- Define `chatCollection` and `messageCollection` using `createCollection` and `localOnlyCollectionOptions`.
- Separate storage keys: `app-chats` and `app-messages`.

### 3. Create Domain Hooks

#### `packages/chats/hooks/use-db-chats.ts`

- Implement `useChats()` for listing chats.
- Implement `useChat(id)` for a single chat.
- CRUD actions: `insert`, `update`, `delete`.

#### `packages/chats/hooks/use-db-messages.ts`

- Implement `useMessages(chatId)` to fetch messages for a chat.
- Implement `useSearchMessages(query)` for global message search.
- CRUD actions: `insert`, `delete`.

### 4. Refactor Existing Hooks & Components

- Update `packages/chats/hooks/use-chat-list.ts` to use `useChats`.
- Update `packages/chats/hooks/use-messages.ts` and `packages/chats/hooks/use-create-message.ts` to use the new TanStack DB logic.
- Update `packages/chats/components/messages-provider.tsx` to source data from TanStack DB.

### 5. Cleanup

- Delete `packages/chats/hooks/use-db-messages-triplit.ts`.
- Delete `packages/chats/hooks/use-db-messages-supabase.ts`.
- Update `packages/chats/index.ts` to export the new hooks.
- Update `packages/chats/README.md`.

## Expected Code Structure

### Collection Definition (`db.ts`)

```typescript
import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

import { ChatSchema, MessageSchema } from './types';

export const chatCollection = createCollection(
  localStorageCollectionOptions({
    schema: ChatSchema,
    queryKey: ['chats'],
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
```

### Domain Hooks (`hooks/use-db-messages.ts`)

```typescript
import { useLiveQuery } from '@tanstack/react-db';

import { messageCollection } from '../db';

export function useMessages(chatId?: string) {
  const { data: messages, isLoading } = useLiveQuery(
    q => {
      let query = q.from({ items: messageCollection });
      if (chatId) {
        query = query.where(({ items }) => eq(items.chat_id, chatId));
      }
      return query.orderBy(({ items }) => items.created_at, 'desc');
    },
    [chatId]
  );

  return {
    messages: messages || [],
    isLoading,
    insert: item => messageCollection.insert(item),
    delete: id => messageCollection.delete(id),
  };
}
```
