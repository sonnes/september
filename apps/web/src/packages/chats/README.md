# @september/chats

Local-first chat and messaging for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export | Description |
| --- | --- |
| `ChatList` | Renders a searchable list of chats with delete confirm dialog |
| `MessageList` | Renders messages in a chat; handles audio playback |
| `EditableChatTitle` | Inline editable title with save/revert behaviour |

### Live-query hooks

These return live data from IndexedDB and re-render on changes.

```ts
const { chats, isLoading, error } = useChats({ userId, searchQuery });
const { messages, isLoading, error } = useMessages({ chatId, searchQuery, limit });
const { message } = useFirstMessage(chatId);
```

### Mutations

Plain async functions that `throw` on failure. Toasts live at call sites.

```ts
import { createChat, updateChat, deleteChat, createMessage } from '@september/chats';

const chat = await createChat(userId, 'New Chat');
await updateChat(chatId, { title: 'Renamed' });
await deleteChat(chatId);          // cascades messages
const msg  = await createMessage({ text, type, user_id, chat_id });
```

### Stateful flow hook

`useCreateAudioMessage` is a hook (not a plain function) because it manages multi-step async state (`generating-speech` → `uploading-audio` → `saving-message`) and accesses `useAccount` / `useSpeech`.

```ts
const { createAudioMessage, status } = useCreateAudioMessage();
```

### Types

```ts
import type { Chat, Message, CreateMessageData } from '@september/chats';
```

## Data layout

| Collection | IndexedDB db | Key |
| --- | --- | --- |
| `chatCollection` | `app-chats` | `id` (uuid) |
| `messageCollection` | `app-messages` | `id` (uuid) |

Messages reference their parent chat via `chat_id`. `deleteChat` cascade-deletes all messages with that `chat_id` before removing the chat row.
