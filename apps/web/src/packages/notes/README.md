# @/packages/notes

Local-first note authoring, space-scoped notes, and slide presentation for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export               | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `NoteEditor`         | Rich text editor with file upload, slides preview, and optional autosave |
| `EditableNoteTitle`  | Inline editable note title                                               |
| `SpaceNotes`         | In-place note editor for a Talk space, autosaved as the user writes      |
| `SpaceNotesPanel`    | Right-panel note selector with voice-over and download actions           |
| `SlidesPresentation` | Slide-by-slide presentation with voice-over and autoplay                 |

### Live-query hooks

These return live data from IndexedDB and re-render on changes.

```ts
const { notes, isLoading, error } = useNotes({ searchQuery, spaceId });
const allSpaceNotes = useNotes({ scope: 'space-notes', searchQuery }); // notes across all spaces
const { note, isLoading, error } = useNote(id);
```

### Mutations

Plain async functions that `throw` on failure. Toasts live at call sites.

```ts
import { createNote, deleteNote, updateNote } from '@/packages/notes';

const note = await createNote({ space_id: spaceId, name: 'Morning note', content: '' });
await updateNote(note.id, { name: 'My note', content: '# Hello' });
await deleteNote(note.id);
```

### Types

```ts
import type { CreateNoteData, Note, UpdateNoteData } from '@/packages/notes';
```

## Data layout

| Collection       | IndexedDB db    | Key         |
| ---------------- | --------------- | ----------- |
| `noteCollection` | `app-documents` | `id` (uuid) |

The IndexedDB name stays `app-documents` so existing local notes survive the rename.

Notes store `id`, `space_id?`, `name?`, `content`, `created_at`, `updated_at`.
Rows with `space_id` are notes that belong to one Talk space. `/notes` lists
notes across all spaces. Notes mode uses `/notes/:spaceSlug/:noteSlug` for
individual notes; Talk mode uses `/talk/:spaceSlug`.

New notes start without a stored title. The editor shows `Untitled note` as a
placeholder and generates the first title from note content on the first save.

## Space notes

`SpaceNotes` renders the note editor as the writing surface. `SpaceNotesPanel` renders the note
selector in the app right panel; the selected note's voice-over and audio download actions are icon
buttons in that panel.
