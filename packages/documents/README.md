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

- `useDocuments`: Core hook for document data and CRUD operations

## Usage

```tsx
import { DocumentEditor, useDocuments } from '@/packages/documents';

export default function WritePage({ params }: { params: { id: string } }) {
  const { documents } = useDocuments();
  const document = documents.find(doc => doc.id === params.id);

  if (!document) return <div>Document not found</div>;

  return <DocumentEditor documentId={document.id} />;
}
```
