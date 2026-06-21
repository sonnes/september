# @/packages/documents

Local-first document authoring, space-scoped notes, and slide presentation for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export                  | Description                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `DocumentList`          | Searchable list of documents with relative timestamps                                     |
| `DocumentEditor`        | Rich text editor with file upload, slides preview, and optional autosave                  |
| `EditableDocumentTitle` | Inline editable document title                                                            |
| `SpaceNotes`            | In-place notes mode for a Talk space, with note list, autosaved editor, and voice actions |
| `SlidesPresentation`    | Slide-by-slide presentation with voice-over and autoplay                                  |

### Live-query hooks

These return live data from IndexedDB and re-render on changes.

```ts
const { documents, isLoading, error } = useDocuments({ searchQuery, spaceId });
const { document, isLoading, error } = useDocument(id);
```

### Mutations

Plain async functions that `throw` on failure. Toasts live at call sites.

```ts
import { createDocument, deleteDocument, updateDocument } from '@/packages/documents';

const doc = await createDocument({ content: '' });
const note = await createDocument({ space_id: spaceId, name: 'Morning note', content: '' });
await updateDocument(doc.id, { name: 'My Doc', content: '# Hello' });
await deleteDocument(doc.id);
```

### Types

```ts
import type { CreateDocumentData, Document, UpdateDocumentData } from '@/packages/documents';
```

## Data layout

| Collection           | IndexedDB db    | Key         |
| -------------------- | --------------- | ----------- |
| `documentCollection` | `app-documents` | `id` (uuid) |

Documents store `id`, `space_id?`, `name?`, `content`, `created_at`, `updated_at`.
Rows with `space_id` are notes that belong to one Talk space; rows without it are global documents.

## Space notes

`SpaceNotes` renders the note editor beside a compact note selector. Note content autosaves after
edits. The selected note's voice-over and audio download actions live in the selector rail, so the
editor remains a writing surface.
