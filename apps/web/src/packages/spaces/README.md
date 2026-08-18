# @/packages/spaces

Local-first spaces and messaging for September. Browser builds use IndexedDB;
desktop builds use SQLite through Rust record RPC.

## Public API

### Components

| Export               | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `SpaceList`          | Renders a searchable list of spaces with delete confirm dialog |
| `MessageList`        | Renders messages in a space; handles audio playback            |
| `EditableSpaceTitle` | Inline editable title with save/revert behaviour               |

### Query hooks

```ts
const { spaces, isLoading, error } = useSpaces({ userId, searchQuery });
const { messages, isLoading, error } = useMessages({ spaceId, searchQuery, limit });
const { message } = useFirstMessage(spaceId);
const { phrases, isLoading, error } = useSavedPhrases({ spaceId }); // pinned first

// Resolve an id-free URL slug ("morning-notes") to a space id. Reactive —
// `spaceId` is undefined until the spaces load and a title match is found
// (legacy `…-<uuid>` slugs still resolve). `spaceIdFromSlug(slug, spaces)` is
// the pure form.
const { spaceId, isLoading } = useSpaceIdFromSlug(spaceSlug);
```

### Mutations

The plain async functions below remain available for non-React callers. React
components use the exported `useCreateSpaceMutation`,
`useCreateDefaultSpaceMutation`, `useUpdateSpaceMutation`,
`useDeleteSpaceMutation`, and `useCreateMessageMutation` hooks. These hooks use
TanStack Query and update the collection cache optimistically where possible.

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
  setPhraseCode,
  setPhrasePinned,
} from '@/packages/spaces';

const seeded = await createDefaultSpace(userId); // "General" + starter saved phrases
const space = await createSpace(userId); // title defaults to "General"
const appointmentSpace = await createSpace(userId, 'Appointments');
await updateSpace(spaceId, { title: 'Renamed', context: '...' });
await deleteSpace(spaceId); // cascades messages + saved phrases + notes
const msg = await createMessage({ text, type, user_id, space_id });

await addManualPhrase(spaceId, userId, 'Call the nurse'); // upsert; pins (promotes AI → pinned)
await addManualPhrase(spaceId, userId, 'What is for dinner', { code: 'wfd' }); // with a code
await setPhrasePinned(phraseId, false); // unpin → regenerable again
await setPhraseCode(phraseId, 'ty'); // set/clear a code; setting pins the row
await removePhrase(phraseId);
// seed/regen write — phrases + starters, AI phrases get auto-codes
await replaceAiPhrases(spaceId, userId, { phrases, starters }, messageCount);

console.log(DEFAULT_SPACE_SEED.title); // "General"
```

### Phrase codes & mining (pure helpers)

```ts
import {
  generateCode,
  // deterministic code from a phrase's content-word initials
  isCommonWord,
  // built-in short-word dictionary (default `isWord` check)
  matchCode,
  // exact case-insensitive lookup; current space wins conflicts
  mineShortcuts,
  // frequency-mine repeated phrases → { text, code, count }[]
  normalizeCode,
  normalizeMinedText,
  // canonical key used by mining + the dismissed-set
  sanitizeStarters,
  // clamp LLM starter output to 2–6-word prefixes
  trailingWord,
  // the word at the composer caret ('' after whitespace)
  validateCode, // format/dictionary/duplicate check with a mutation suggestion
} from '@/packages/spaces';
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

Two optional fields extend the row:

- **`kind`** — `'phrase'` (complete, speakable; the default when absent) or
  `'starter'` (a 3–5-word sentence-opening prefix). Starters share the whole
  pin/regen lifecycle.
- **`code`** — a short abbreviation (stored lowercase) that surfaces the phrase
  at the top of the suggestion stripe while typing (`ty` → "Thank you").
  A **user-set** code pins its row (user code ⇒ pinned). Seeding assigns codes
  to AI phrases too — deterministically via `generateCode`, never by the LLM —
  and those AI codes are replaced along with their rows on regen. Codes are
  unique app-wide and matched across spaces (current space wins conflicts).

**Shortcut mining** (`mineShortcuts`) proposes phrase+code pairs from repeated
messages — local counting only, no LLM. Candidates matching any existing phrase
(pinned or AI-seeded) or a dismissed entry are excluded. The Phrases tab shows
proposals as "Shortcut ideas"; dismissals persist in `localStorage`
(`september:mined-dismissed`, keyed by `normalizeMinedText`).

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
The prompt (`buildPhrasesPrompt`) marks pinned rows `[pinned]` so the model
skips them, and embeds history as `Me:`/`Them:` lines (`formatPhraseHistory`)
so transcriptions aren't attributed to the user.
`Space.phrases_synced_count` records the message count at the last generation.

The suggestion stripe's curated default mixes phrase rows (`topPhrases`, pinned
first) with up to 2 starter rows (`topRows(_, 2, 'starter')`) inside a 5-row
budget. See `docs/concepts/saved-phrases.md`.

## Data layout

Browser builds keep the existing stores, so current web data survives this
change.

| Collection              | IndexedDB db        | Key         | Query indexes            |
| ----------------------- | ------------------- | ----------- | ------------------------ |
| `spaceCollection`       | `app-spaces`        | `id` (uuid) | `user_id`, `updated_at`  |
| `messageCollection`     | `app-messages`      | `id` (uuid) | `space_id`, `created_at` |
| `savedPhraseCollection` | `app-saved-phrases` | `id` (uuid) | `space_id`, `created_at` |

Message search uses a leading-wildcard `ilike`, which TanStack DB 0.6 cannot
serve from a `BasicIndex`. It scans the rows selected by `space_id`.

Space notes live in `@/packages/notes` as `noteCollection` rows with
`space_id` set. `deleteSpace` also removes those scoped note rows.

Desktop builds store the same domain objects as JSON records in the SQLite
collections `spaces`, `messages`, and `saved-phrases`. Rust owns versioning and
tombstones. Hooks read both backends through the shared record client and keep
the same return shapes. Desktop space cascades and generated-phrase replacement
use one Rust transaction for all affected records.

The separate chat display uses a named Tauri window on desktop. The main
window waits for the display listener before it sends targeted Tauri events.
If delivery fails, audio plays in the main window. The browser build continues
to use a popup and `BroadcastChannel`.
