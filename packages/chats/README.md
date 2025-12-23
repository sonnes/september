# Chats Module

This package manages the chat and messaging functionality of the September app. It uses **TanStack DB** for local-first data storage.

## Responsibilities

- **Chat Management**: Listing, creating, and editing chats.
- **Messaging**: Sending and receiving messages within a chat.
- **Local-First**: Data is stored locally using TanStack DB.

## Directory Structure

- `components/`: React components for chats and messages.
- `hooks/`: Custom hooks for interacting with chat and message data.
- `db.ts`: TanStack DB collection definitions.
- `types/`: Zod schemas and TypeScript interfaces for chat and message data.

## Usage

### Components

```tsx
import { ChatList, MessageList, MessagesProvider } from '@/packages/chats';
```

### Hooks

#### Query Hooks
```tsx
import { useChats, useMessages } from '@/packages/chats';

// Get chats for a user
const { chats, isLoading, error } = useChats({ userId, searchQuery });

// Get messages for a chat
const { messages, isLoading, error } = useMessages({ chatId, searchQuery });
```

#### Mutation Hooks
```tsx
import {
  useCreateChat,
  useCreateMessage,
  useCreateAudioMessage,
  useUpdateChat,
  useDeleteChat,
  useDeleteMessage
} from '@/packages/chats';

// Create a new chat
const { createChat } = useCreateChat();

// Create a new message (updates chat's updated_at)
const { createMessage } = useCreateMessage();

// Create an audio message (generates speech and uploads audio)
const { createAudioMessage, status } = useCreateAudioMessage();

// Update a chat
const { updateChat, isUpdating } = useUpdateChat();
await updateChat(chatId, { title: 'New Title' });

// Delete a chat
const { deleteChat, isDeleting } = useDeleteChat();
await deleteChat(chatId);

// Delete a message
const { deleteMessage, isDeleting } = useDeleteMessage();
await deleteMessage(messageId);
```

### Types

```tsx
import { Chat, Message } from '@/packages/chats';
```
