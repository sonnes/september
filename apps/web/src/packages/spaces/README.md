# @/packages/spaces

Local-first spaces and messaging for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export               | Description                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SpaceList`          | Renders a searchable list of spaces with delete confirm dialog                                                             |
| `MessageList`        | Renders messages in a space; handles audio playback                                                                        |
| `EditableSpaceTitle` | Inline editable title with save/revert behaviour                                                                           |
| `SpaceSwitch`        | Segmented switch (above the editor) to jump between spaces; trailing button creates a new space. Navigates to `/talk/$id`. |

### Live-query hooks

```ts
const { spaces, isLoading, error } = useSpaces({ userId, searchQuery });
const { messages, isLoading, error } = useMessages({ spaceId, searchQuery, limit });
const { message } = useFirstMessage(spaceId);
const { phrases, isLoading, error } = useSavedPhrases({ spaceId }); // pinned first
```

### Mutations

```ts
import {
  DEFAULT_SPACE_SEED,
  createDefaultSpace,
  createMessage,
  createSpace,
  deleteSpace,
  updateSpace,
} from '@/packages/spaces';
// Saved phrases
import {
  addManualPhrase,
  removePhrase,
  replaceAiPhrases,
  setPhrasePinned,
} from '@/packages/spaces';

const seeded = await createDefaultSpace(userId); // "General" + starter saved phrases
const space = await createSpace(userId); // title defaults to "General"
const appointmentSpace = await createSpace(userId, 'Appointments');
await updateSpace(spaceId, { title: 'Renamed', context: '...' });
await deleteSpace(spaceId); // cascades messages + saved phrases + notes
const msg = await createMessage({ text, type, user_id, space_id });

await addManualPhrase(spaceId, userId, 'Call the nurse'); // upsert; pins (promotes AI → pinned)
await setPhrasePinned(phraseId, false); // unpin → regenerable again
await removePhrase(phraseId);
await replaceAiPhrases(spaceId, userId, aiTexts, messageCount); // seed/regen write

console.log(DEFAULT_SPACE_SEED.title); // "General"
```

### Types

```ts
import type { CreateMessageData, Message, SavedPhrase, Space } from '@/packages/spaces';
```

## Saved phrases

Per-space ready-to-use phrases, stored as one row per phrase in
`savedPhraseCollection`. A single `pinned` flag is the AI/manual distinction:

- `pinned: true` — the user kept it (added manually, or pinned a suggestion). Durable.
- `pinned: false` — AI-generated. Replaced on each regeneration.

`createDefaultSpace(userId)` creates the first-run `General` space from
`DEFAULT_SPACE_SEED`, including generic greeting and reply starter phrases used
by the marketing live demo. It leaves `phrases_synced_count` unset, so the first
real message can still trigger normal AI seeding and replace those starter AI
rows. Plain `createSpace` only creates the space row.

`useSyncSpacePhrases({ space, phrases, messages, messagesLoading })` owns
generation triggering: it **seeds** on the first message (and backfills spaces
that predate the feature) and **regenerates on open** once the history has grown
stale (see `isStale` / `PHRASES_STALE_AFTER`). `replaceAiPhrases` only ever
rewrites `pinned: false` rows — **pinned phrases are never overwritten, reordered,
or dropped** (`dedupeAgainstPinned` keeps fresh AI texts clear of pinned ones).
`Space.phrases_synced_count` records the message count at the last generation.

The suggestion stripe shows the top 5 (`topPhrases`, pinned first) as its curated
default. See `docs/concepts/saved-phrases.md`.

## Data layout

| Collection              | IndexedDB db        | Key         |
| ----------------------- | ------------------- | ----------- |
| `spaceCollection`       | `app-spaces`        | `id` (uuid) |
| `messageCollection`     | `app-messages`      | `id` (uuid) |
| `savedPhraseCollection` | `app-saved-phrases` | `id` (uuid) |

Space notes live in `@/packages/documents` as `documentCollection` rows with
`space_id` set. `deleteSpace` also removes those scoped note rows.
