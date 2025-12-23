# Migration Plan: Documents Package to TanStack DB

This document outlines the steps to migrate the `packages/documents/` module from Triplit to TanStack DB. Following the project architecture, Supabase is restricted to Authentication and File Storage only. Document data will be stored locally using TanStack DB.

## Overview

We are moving document data entirely to TanStack DB.

- **TanStack DB**: Primary store for documents (local-first).
- **Supabase**: Not used for document data. Used only for Auth (user context).
- **Triplit**: Completely removed.

## Step-by-Step Migration

### 1. Define Zod Schemas

Create or update Zod schemas in `packages/documents/types/` to be used with TanStack DB.

- `DocumentSchema`: `id` (uuid), `name` (optional string), `content` (string), `created_at` (date), `updated_at` (date).
- `PutDocumentDataSchema`: Optional fields for creating/updating documents.

### 2. Initialize TanStack DB Collections

Create `packages/documents/db.ts`:

- Define `documentCollection` using `createCollection` and `localStorageCollectionOptions`.
- Storage key: `app-documents`.

### 3. Create Domain Hook

#### `packages/documents/hooks/use-documents.ts`

- Implement `useDocuments({ searchQuery? })` for listing documents with optional search filtering.
- Include CRUD operations: `putDocument` (create/update) and `deleteDocument`.
- Return documents list, loading state, and error state.

### 4. Refactor Existing Components

- Update `packages/documents/components/documents-provider.tsx` to use the new TanStack DB hook.
- Update `packages/documents/components/editable-document-title.tsx` to use collection `update` instead of direct Triplit calls.

### 5. Cleanup

- Remove Triplit imports from all document-related files.
- Update `packages/documents/index.ts` to export the new hooks.
- Update `packages/documents/README.md` to reflect TanStack DB usage.

## Expected Code Structure

### Collection Definition (`db.ts`)

```typescript
import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db';

import { DocumentSchema } from './types';

export const documentCollection = createCollection(
  localStorageCollectionOptions({
    schema: DocumentSchema,
    id: 'documents',
    storageKey: 'app-documents',
    getKey: item => item.id,
  })
);
```

### Domain Hook (`hooks/use-documents.ts`)

```typescript
'use client';

import { useCallback, useMemo } from 'react';

import { ilike } from '@tanstack/db';
import { useLiveQuery } from '@tanstack/react-db';
import { v4 as uuidv4 } from 'uuid';

import { documentCollection } from '../db';
import { Document, PutDocumentData } from '../types';

export function useDocuments({ searchQuery }: { searchQuery?: string } = {}) {
  const {
    data: documents,
    isLoading,
    isError,
    status,
  } = useLiveQuery(
    q => {
      let query = q.from({ items: documentCollection });
      if (searchQuery) {
        query = query.where(({ items }) => ilike(items.name, `%${searchQuery}%`));
      }
      return query.orderBy(({ items }) => items.updated_at, 'desc');
    },
    [searchQuery]
  );

  const error = useMemo(
    () => (isError ? { message: `Database error: ${status}` } : undefined),
    [isError, status]
  );

  const putDocument = useCallback(
    async (data: PutDocumentData): Promise<Document> => {
      const now = new Date();

      if (data.id) {
        // Update existing document
        await documentCollection.update(data.id, draft => {
          if (data.name !== undefined) draft.name = data.name;
          if (data.content !== undefined) draft.content = data.content;
          draft.updated_at = now;
        });

        const updated = documents?.find(d => d.id === data.id);
        if (!updated) throw new Error('Document not found after update');
        return updated;
      } else {
        // Create new document
        const newDocument: Document = {
          id: uuidv4(),
          name: data.name,
          content: data.content || '',
          created_at: data.created_at || now,
          updated_at: now,
        };

        documentCollection.insert(newDocument);
        return newDocument;
      }
    },
    [documents]
  );

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    await documentCollection.delete(id);
  }, []);

  return {
    documents: (documents || []) as Document[],
    fetching: isLoading,
    error,
    putDocument,
    deleteDocument,
  };
}
```

### Updated Component (`components/editable-document-title.tsx`)

Replace direct Triplit call with hook method:

```typescript
import { useDocumentsContext } from '@/packages/documents/components/documents-provider';

// In component:
const { putDocument } = useDocumentsContext();

// In handleSave:
await putDocument({
  id: documentId,
  name: newName,
});
```

## Migration Checklist

- [ ] Create Zod schemas in `packages/documents/types/index.ts`
- [ ] Create `packages/documents/db.ts` with `documentCollection`
- [ ] Update `packages/documents/hooks/use-documents.ts` to use TanStack DB
- [ ] Update `packages/documents/components/documents-provider.tsx` to use new hook
- [ ] Update `packages/documents/components/editable-document-title.tsx` to use hook's `putDocument` method
- [ ] Remove all Triplit imports from document-related files
- [ ] Update `packages/documents/index.ts` exports
- [ ] Update `packages/documents/README.md` to reflect TanStack DB usage
- [ ] Test document CRUD operations
- [ ] Test document search functionality
- [ ] Test document title editing
