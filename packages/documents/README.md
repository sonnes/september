# Documents Module

This module handles document management, editing, and slide presentations.

## Features

- Document CRUD operations (local-first via TanStack DB)
- Tiptap-based editor
- Text extraction from uploaded files (via Gemini)
- Slide presentation from markdown content
- Editable document titles

## Components

- `DocumentList`: List of all documents with search
- `DocumentEditor`: The main editor interface (requires `documentId` prop)
- `EditableDocumentTitle`: Inline editable title for documents
- `SlidesPresentation`: Full-screen slide viewer

## Hooks

### Query Hooks

- `useDocuments`: Fetch all documents with optional search.
- `useDocument(id)`: Fetch a single document by ID.

### Mutation Hooks

- `useCreateDocument`: Create a new document.
- `useUpdateDocument`: Update an existing document.
- `useDeleteDocument`: Delete a document.

## Usage

### Fetching a Single Document

```tsx
import { DocumentEditor, useDocument } from '@/packages/documents';

export default function WritePage({ params }: { params: { id: string } }) {
  const { document, isLoading, error } = useDocument(params.id);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!document) return <div>Document not found</div>;

  return <DocumentEditor documentId={document.id} />;
}
```

### Creating and Updating Documents

```tsx
import { useCreateDocument, useUpdateDocument } from '@/packages/documents';

function DocumentActions() {
  const { createDocument, isCreating } = useCreateDocument();
  const { updateDocument, isUpdating } = useUpdateDocument();

  const handleCreate = async () => {
    await createDocument({ title: 'New Document', content: '' });
  };

  const handleUpdate = async (id: string) => {
    await updateDocument(id, { title: 'Updated Title' });
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        Create
      </button>
      {/* ... */}
    </div>
  );
}
```
