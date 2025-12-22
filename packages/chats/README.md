# Chats Module

This package manages the chat and messaging functionality of the September app.

## Responsibilities

- **Chat Management**: Listing, creating, and editing chats.
- **Messaging**: Sending and receiving messages within a chat.
- **Dual Database Support**: Integration with both Supabase (cloud) and Triplit (local-first) for messaging.

## Directory Structure

- `components/`: React components for chats and messages.
- `hooks/`: Custom hooks for interacting with chat and message data.
- `lib/`: Utility functions specific to chats and messages.
- `types/`: TypeScript definitions and Zod schemas for chat and message data.

## Usage

### Components

```tsx
import { ChatList, MessageList } from '@/packages/chats';
```

### Hooks

```tsx
import { useChatList, useMessagesSupabase, useMessagesTriplit } from '@/packages/chats';
```

### Types

```tsx
import { Chat, Message } from '@/packages/chats';
```
