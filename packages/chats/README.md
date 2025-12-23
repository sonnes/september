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

```tsx
import { useChatList, useChats, useMessages, useCreateMessage } from '@/packages/chats';
```

### Types

```tsx
import { Chat, Message } from '@/packages/chats';
```
