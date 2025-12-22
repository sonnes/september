# Documents Module

This module handles document management, editing, and slide presentations.

## Features

- Document CRUD operations (local-first via Triplit)
- Tiptap-based editor
- Text extraction from uploaded files (via Gemini)
- Slide presentation from markdown content
- Editable document titles

## Components

- `DocumentsProvider`: Context provider for document state
- `DocumentList`: List of all documents with search
- `DocumentEditor`: The main editor interface
- `EditableDocumentTitle`: Inline editable title for documents
- `SlidesPresentation`: Full-screen slide viewer

## Hooks

- `useDocuments`: Core hook for document data
- `useDocumentsContext`: Access the documents context

## Usage

```tsx
import { DocumentsProvider, DocumentEditor } from '@/packages/documents';

export default function WritePage({ params }: { params: { id: string } }) {
  return (
    <DocumentsProvider initialId={params.id}>
      <DocumentEditor />
    </DocumentsProvider>
  );
}
```

