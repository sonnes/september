# @/packages/spaces

Local-first spaces and messaging for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export | Description |
| --- | --- |
| `SpaceList` | Renders a searchable list of spaces with delete confirm dialog |
| `MessageList` | Renders messages in a space; handles audio playback |
| `EditableSpaceTitle` | Inline editable title with save/revert behaviour |

### Live-query hooks

```ts
const { spaces, isLoading, error } = useSpaces({ userId, searchQuery });
const { messages, isLoading, error } = useMessages({ spaceId, searchQuery, limit });
const { message } = useFirstMessage(spaceId);
```

### Mutations

```ts
import { createSpace, updateSpace, deleteSpace, createMessage } from '@/packages/spaces';

const space = await createSpace(userId, 'New Space');
await updateSpace(spaceId, { title: 'Renamed', context: '...' });
await deleteSpace(spaceId);          // cascades messages
const msg  = await createMessage({ text, type, user_id, space_id });
```

### Types

```ts
import type { Space, Message, CreateMessageData } from '@/packages/spaces';
```

## Data layout

| Collection | IndexedDB db | Key |
| --- | --- | --- |
| `spaceCollection` | `app-spaces` | `id` (uuid) |
| `messageCollection` | `app-messages` | `id` (uuid) |
