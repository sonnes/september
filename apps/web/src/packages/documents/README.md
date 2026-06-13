# @september/documents

Local-first document authoring and slide presentation for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export | Description |
| --- | --- |
| `DocumentList` | Searchable list of documents with relative timestamps |
| `DocumentEditor` | Rich text editor with file upload and slides preview |
| `EditableDocumentTitle` | Inline editable document title |
| `SlidesPresentation` | Slide-by-slide presentation with voice-over and autoplay |

### Live-query hooks

These return live data from IndexedDB and re-render on changes.

```ts
const { documents, isLoading, error } = useDocuments({ searchQuery });
const { document, isLoading, error } = useDocument(id);
```

### Mutations

Plain async functions that `throw` on failure. Toasts live at call sites.

```ts
import { createDocument, updateDocument, deleteDocument } from '@september/documents';

const doc = await createDocument({ content: '' });
await updateDocument(doc.id, { name: 'My Doc', content: '# Hello' });
await deleteDocument(doc.id);
```

### Types

```ts
import type { Document, CreateDocumentData, UpdateDocumentData } from '@september/documents';
```

## Data layout

| Collection | IndexedDB db | Key |
| --- | --- | --- |
| `documentCollection` | `app-documents` | `id` (uuid) |

Documents store `id`, `name?`, `content`, `created_at`, `updated_at`.
