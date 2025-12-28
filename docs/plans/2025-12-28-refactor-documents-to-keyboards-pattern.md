# Refactor Documents Package to Match Keyboards Pattern

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-28

**Goal:** Align documents package with keyboards package conventions for type definitions and component architecture

**Architecture:**
1. Introduce explicit CreateDocumentData and UpdateDocumentData types to match keyboards pattern
2. Export documentCollection in public API
3. Remove unused types (PutDocumentData, PartialDocument)
4. Extract component business logic to custom hooks (useDocumentEditor, useEditableTitle, useFileUpload)
5. Transform components to be primarily presentational

**Tech Stack:** TypeScript, TanStack DB, React hooks, uuid

**Success Criteria:**
- [ ] All builds complete without errors
- [ ] Linter passes with no warnings
- [ ] All consumers (write pages) continue to function
- [ ] Manual tests verify CRUD operations work
- [ ] Documentation updated to reflect new type names
- [ ] Component business logic extracted to hooks
- [ ] Components are primarily presentational

---

## Architecture Overview

### System Structure
The documents package follows a modular architecture:
- `types/index.ts`: Domain types and schemas
- `db.ts`: TanStack DB collection configuration
- `hooks/`: Query and mutation hooks for CRUD operations
- `components/`: UI components for document management
- `index.ts`: Public API exports

### Current State
The documents package already follows most keyboards patterns:
- Uses TanStack DB for local-first storage
- Implements separate query hooks (useDocuments, useDocument) and mutation hooks (useCreateDocument, useUpdateDocument, useDeleteDocument)
- Consistent error handling (query hooks return errors, mutation hooks throw)
- Proper toast notifications and loading states

### Gap Analysis
Main differences from keyboards pattern:
1. **Type Definitions**: Uses inline types `Omit<Document, 'id' | 'created_at' | 'updated_at'>` instead of explicit CreateDocumentData type
2. **Unused Types**: Has PutDocumentData and PartialDocument that aren't used anywhere
3. **Public API**: Doesn't export documentCollection (keyboards exports customKeyboardCollection)
4. **Component Logic**: Components contain business logic (state management, data fetching) instead of delegating to hooks
   - `DocumentEditor`: Manages content state, dirty state, dialog states, and save logic
   - `EditableDocumentTitle`: Manages editing state and save logic
   - `UploadForm`: Manages file upload state and AI extraction logic
   - Compare to keyboards: `CustomKeyboardList` is simple, delegates delete confirmation to hook; `CustomKeyboardEditor` uses react-hook-form for state

### Data Flow
```
User Action → Hook → TanStack DB → IndexedDB
                ↓
         Toast Notification
```

### Key Design Decisions

1. **Keep UUID**: Documents use uuid v4 for IDs (keyboards use nanoid). No migration needed - this is acceptable variance between packages. UUID is appropriate for documents which may eventually sync to Supabase.

2. **Explicit Input Types**: Define CreateDocumentData and UpdateDocumentData types following keyboards pattern for clarity and type safety.

3. **Remove Unused Types**: Delete PutDocumentData and PartialDocument to reduce confusion.

4. **Export Collection**: Add documentCollection to public API for advanced use cases (matching keyboards pattern).

5. **Extract Component Logic to Hooks**: Following the keyboards pattern, create custom hooks to manage component-specific business logic:
   - `useDocumentEditor`: Manage editor state (content, dirty tracking, autosave)
   - `useEditableTitle`: Manage title editing state and save logic
   - `useFileUpload`: Manage file upload and AI text extraction
   - Components become primarily presentational, consuming these hooks
   - Benefits: Better testability, reusability, separation of concerns

### Integration Points
- `app/(app)/write/page.tsx` → useCreateDocument, useDocuments, DocumentList
- `app/(app)/write/[id]/page.tsx` → useDocuments, DocumentEditor

### Error Handling Strategy
Already consistent with keyboards:
- Query hooks: Return `{ data, isLoading, error }` where error is `{ message: string }`
- Mutation hooks: Throw errors for error boundaries, show toast notifications

### Testing Strategy
- **Manual Testing**: Full CRUD workflow (create, read, update, delete documents)
- **Build Validation**: TypeScript compilation must pass
- **Lint Validation**: ESLint must pass with no warnings

---

## Interface Definitions

### Module: Documents Types

**File:** `packages/documents/types/index.ts`

**Before:**
```typescript
import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

export interface PutDocumentData {  // UNUSED - to be removed
  id?: string;
  name?: string;
  content?: string;
  created_at?: Date;
}

export type PartialDocument = Partial<Document>;  // UNUSED - to be removed
```

**After:**
```typescript
import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

// Input type for creating documents (omits auto-generated fields)
export type CreateDocumentData = Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

// Input type for updating documents
export type UpdateDocumentData = Partial<Omit<Document, 'id' | 'created_at'>>;
```

**Changes:**
- Add CreateDocumentData type (matches keyboards CreateCustomKeyboardData pattern)
- Add UpdateDocumentData type (matches keyboards UpdateCustomKeyboardData pattern)
- Remove PutDocumentData (unused type)
- Remove PartialDocument (unused type)
- Add inline comments explaining purpose

**Rationale:** 
- Explicit types make intent clear at call sites
- Prevents accidental passing of id/timestamps in updates
- Matches keyboards package convention
- Optional id/timestamps in CreateDocumentData support import/restore scenarios

---

### Module: Documents Hooks

**File:** `packages/documents/hooks/use-create-document.ts`

**Before:**
```typescript
export interface UseCreateDocumentReturn {
  createDocument: (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>) => Promise<Document>;
  isCreating: boolean;
}

export function useCreateDocument(): UseCreateDocumentReturn {
  const createDocument = useCallback(
    async (data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> => {
      // ... implementation
    },
    []
  );
  // ...
}
```

**After:**
```typescript
import { CreateDocumentData } from '../types';

export interface UseCreateDocumentReturn {
  createDocument: (data: CreateDocumentData) => Promise<Document>;
  isCreating: boolean;
}

export function useCreateDocument(): UseCreateDocumentReturn {
  const createDocument = useCallback(
    async (data: CreateDocumentData): Promise<Document> => {
      // ... implementation (unchanged)
    },
    []
  );
  // ...
}
```

**Changes:**
- Import CreateDocumentData type
- Replace inline `Omit<Document, ...>` with CreateDocumentData
- No implementation logic changes

---

**File:** `packages/documents/hooks/use-update-document.ts`

**Before:**
```typescript
export interface UseUpdateDocumentReturn {
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateDocument(): UseUpdateDocumentReturn {
  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    // ... implementation
  }, []);
  // ...
}
```

**After:**
```typescript
import { UpdateDocumentData } from '../types';

export interface UseUpdateDocumentReturn {
  updateDocument: (id: string, updates: UpdateDocumentData) => Promise<void>;
  isUpdating: boolean;
}

export function useUpdateDocument(): UseUpdateDocumentReturn {
  const updateDocument = useCallback(async (id: string, updates: UpdateDocumentData) => {
    // ... implementation (unchanged)
  }, []);
  // ...
}
```

**Changes:**
- Import UpdateDocumentData type
- Replace `Partial<Document>` with UpdateDocumentData
- No implementation logic changes

---

### Module: Documents Public API

**File:** `packages/documents/index.ts`

**Before:**
```typescript
export * from '@/packages/documents/types';
export * from '@/packages/documents/hooks/use-documents';
export * from '@/packages/documents/hooks/use-document';
export * from '@/packages/documents/hooks/use-create-document';
export * from '@/packages/documents/hooks/use-update-document';
export * from '@/packages/documents/hooks/use-delete-document';
export * from '@/packages/documents/components/document-list';
export * from '@/packages/documents/components/document-editor';
export * from '@/packages/documents/components/editable-document-title';
export * from '@/packages/documents/components/slides-presentation';
```

**After:**
```typescript
export * from '@/packages/documents/types';
export * from '@/packages/documents/hooks/use-documents';
export * from '@/packages/documents/hooks/use-document';
export * from '@/packages/documents/hooks/use-create-document';
export * from '@/packages/documents/hooks/use-update-document';
export * from '@/packages/documents/hooks/use-delete-document';
export * from '@/packages/documents/components/document-list';
export * from '@/packages/documents/components/document-editor';
export * from '@/packages/documents/components/editable-document-title';
export * from '@/packages/documents/components/slides-presentation';

export { documentCollection } from '@/packages/documents/db';
```

**Changes:**
- Add documentCollection export (matches keyboards pattern)

**Rationale:**
Exporting the collection allows advanced use cases like direct collection queries, batch operations, or custom subscriptions while maintaining encapsulation of hook implementations.

---

## Task Breakdown

### Phase 1: Type System Refactor (Tasks 1-4)

### Task 1: Update Type Definitions

**Objective:** Replace inline types with explicit CreateDocumentData and UpdateDocumentData types

**Files:**
- Edit: `packages/documents/types/index.ts`

**Implementation:**

1. Remove unused types (PutDocumentData, PartialDocument)
2. Add CreateDocumentData type after Document type definition:
   ```typescript
   // Input type for creating documents (omits auto-generated fields)
   export type CreateDocumentData = Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
     id?: string;
     created_at?: Date;
     updated_at?: Date;
   };
   ```
3. Add UpdateDocumentData type:
   ```typescript
   // Input type for updating documents
   export type UpdateDocumentData = Partial<Omit<Document, 'id' | 'created_at'>>;
   ```

**Validation:**
- File compiles without errors
- No references to PutDocumentData or PartialDocument exist (verify with grep)
- Build passes: `pnpm run build`

**Expected Output:**
```
✓ types/index.ts compiles
✓ No references to removed types
✓ Build succeeds
```

---

### Task 2: Update useCreateDocument Hook

**Objective:** Use CreateDocumentData type in hook signature

**Files:**
- Edit: `packages/documents/hooks/use-create-document.ts`

**Implementation:**

1. Add import at top of file:
   ```typescript
   import type { CreateDocumentData, Document } from '../types';
   ```
2. Update UseCreateDocumentReturn interface:
   ```typescript
   export interface UseCreateDocumentReturn {
     createDocument: (data: CreateDocumentData) => Promise<Document>;
     isCreating: boolean;
   }
   ```
3. Update createDocument callback parameter type:
   ```typescript
   async (data: CreateDocumentData): Promise<Document> => {
   ```
4. No changes to implementation logic (already handles optional id, timestamps correctly)

**Validation:**
- Hook compiles without errors
- Type inference works at call sites
- Build passes: `pnpm run build`

**Expected Output:**
```
✓ use-create-document.ts compiles
✓ Existing consumers still compile
✓ Build succeeds
```

---

### Task 3: Update useUpdateDocument Hook

**Objective:** Use UpdateDocumentData type in hook signature

**Files:**
- Edit: `packages/documents/hooks/use-update-document.ts`

**Implementation:**

1. Update import to include UpdateDocumentData:
   ```typescript
   import type { Document, UpdateDocumentData } from '../types';
   ```
2. Update UseUpdateDocumentReturn interface:
   ```typescript
   export interface UseUpdateDocumentReturn {
     updateDocument: (id: string, updates: UpdateDocumentData) => Promise<void>;
     isUpdating: boolean;
   }
   ```
3. Update updateDocument callback parameter type:
   ```typescript
   async (id: string, updates: UpdateDocumentData) => {
   ```
4. No changes to implementation logic

**Validation:**
- Hook compiles without errors
- Type inference works at call sites
- Build passes: `pnpm run build`

**Expected Output:**
```
✓ use-update-document.ts compiles
✓ Existing consumers still compile
✓ Build succeeds
```

---

### Task 4: Export documentCollection

**Objective:** Add documentCollection to public API

**Files:**
- Edit: `packages/documents/index.ts`

**Implementation:**

1. Add collection export at end of file:
   ```typescript
   export { documentCollection } from '@/packages/documents/db';
   ```

**Validation:**
- Import works: `import { documentCollection } from '@/packages/documents'`
- Build passes: `pnpm run build`

**Expected Output:**
```
✓ documentCollection is exported
✓ No circular dependency issues
✓ Build succeeds
```

---

### Task 5: Update README Documentation

**Objective:** Update documentation to reflect new type names

**Files:**
- Edit: `packages/documents/README.md`

**Implementation:**

Update the "Creating and Updating Documents" section example:

**Before:**
```tsx
const handleCreate = async () => {
  await createDocument({ title: 'New Document', content: '' });
};
```

**After:**
```tsx
import { useCreateDocument, useUpdateDocument, CreateDocumentData, UpdateDocumentData } from '@/packages/documents';

function DocumentActions() {
  const { createDocument, isCreating } = useCreateDocument();
  const { updateDocument, isUpdating } = useUpdateDocument();

  const handleCreate = async () => {
    const data: CreateDocumentData = { name: 'New Document', content: '' };
    await createDocument(data);
  };

  const handleUpdate = async (id: string) => {
    const updates: UpdateDocumentData = { name: 'Updated Title' };
    await updateDocument(id, updates);
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

Add a "Types" section before "Usage":

```markdown
## Types

- `Document`: Full document type with all fields
- `CreateDocumentData`: Input type for creating documents (omits auto-generated fields)
- `UpdateDocumentData`: Input type for updating documents (omits id and created_at)
```

Add a "Database" section at the end:

```markdown
## Database

Documents are stored locally using TanStack DB (IndexedDB):
- Database name: `app-documents`
- Multi-tab synchronization via BroadcastChannel
- Automatic persistence across sessions
- Collection export: `import { documentCollection } from '@/packages/documents'`
```

**Validation:**
- Documentation is accurate
- Examples are copy-pasteable and compile
- Formatting is consistent

---

### Phase 2: Extract Component Logic to Hooks (Tasks 6-9)

### Task 6: Create useDocumentEditor Hook

**Objective:** Extract DocumentEditor business logic into a custom hook

**Files:**
- Create: `packages/documents/hooks/use-document-editor.ts`
- Edit: `packages/documents/components/document-editor.tsx`

**Implementation:**

1. Create new hook `packages/documents/hooks/use-document-editor.ts`:

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDocument } from './use-document';
import { useUpdateDocument } from './use-update-document';

export interface UseDocumentEditorOptions {
  documentId: string;
  autoSaveDelay?: number; // Optional: implement autosave
}

export interface UseDocumentEditorReturn {
  // State
  content: string;
  isDirty: boolean;
  document: ReturnType<typeof useDocument>['document'];
  isLoading: ReturnType<typeof useDocument>['isLoading'];

  // Dialog states
  isUploadDialogOpen: boolean;
  isSlidesDialogOpen: boolean;

  // Actions
  handleContentChange: (content: string, markdown: string) => void;
  handleSave: () => Promise<void>;
  handleUploadFile: () => void;
  handleSlidesPreview: () => void;
  handleTextExtracted: (text: string) => Promise<void>;
  setIsUploadDialogOpen: (open: boolean) => void;
  setIsSlidesDialogOpen: (open: boolean) => void;
}

export function useDocumentEditor({
  documentId,
}: UseDocumentEditorOptions): UseDocumentEditorReturn {
  const { document, isLoading } = useDocument(documentId);
  const { updateDocument } = useUpdateDocument();

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSlidesDialogOpen, setIsSlidesDialogOpen] = useState(false);
  const [prevDocumentId, setPrevDocumentId] = useState<string | null>(null);

  // Sync content when document changes
  useEffect(() => {
    if (document && document.id !== prevDocumentId) {
      setPrevDocumentId(document.id);
      setContent(document.content || '');
      setIsDirty(false);
    }
  }, [document, prevDocumentId]);

  const handleContentChange = useCallback((_content: string, markdown: string) => {
    setContent(markdown);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!document?.id) return;
    await updateDocument(document.id, { content });
    setIsDirty(false);
  }, [document?.id, content, updateDocument]);

  const handleUploadFile = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleSlidesPreview = useCallback(() => {
    setIsSlidesDialogOpen(true);
  }, []);

  const handleTextExtracted = useCallback(async (text: string) => {
    if (!document) return;
    const existing = document.content || '';
    await updateDocument(document.id, { content: existing + text });
    setIsUploadDialogOpen(false);
    setIsDirty(false);
  }, [document, updateDocument]);

  return {
    content,
    isDirty,
    document,
    isLoading,
    isUploadDialogOpen,
    isSlidesDialogOpen,
    handleContentChange,
    handleSave,
    handleUploadFile,
    handleSlidesPreview,
    handleTextExtracted,
    setIsUploadDialogOpen,
    setIsSlidesDialogOpen,
  };
}
```

2. Update `packages/documents/components/document-editor.tsx` to use the hook:
   - Remove all useState and useCallback declarations
   - Replace `useDocument` and `useUpdateDocument` with `useDocumentEditor`
   - Simplify component to only handle rendering

**Validation:**
- Component compiles without errors
- Editor functionality unchanged
- Dirty state tracking works
- Save functionality works
- Upload dialog works
- Slides dialog works

---

### Task 7: Create useEditableTitle Hook

**Objective:** Extract EditableDocumentTitle business logic into a custom hook

**Files:**
- Create: `packages/documents/hooks/use-editable-title.ts`
- Edit: `packages/documents/components/editable-document-title.tsx`

**Implementation:**

1. Create new hook `packages/documents/hooks/use-editable-title.ts`:

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUpdateDocument } from './use-update-document';

export interface UseEditableTitleOptions {
  documentId: string;
  initialName?: string;
}

export interface UseEditableTitleReturn {
  // State
  value: string;
  isEditing: boolean;
  isSaving: boolean;

  // Actions
  setValue: (value: string) => void;
  startEditing: () => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useEditableTitle({
  documentId,
  initialName,
}: UseEditableTitleOptions): UseEditableTitleReturn {
  const { updateDocument } = useUpdateDocument();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialName || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync value when initialName changes
  useEffect(() => {
    setValue(initialName || '');
  }, [initialName]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const trimmedValue = value.trim();
    const newName = trimmedValue || undefined;

    // Only update if the name actually changed
    if (newName !== (initialName || undefined)) {
      setIsSaving(true);
      try {
        await updateDocument(documentId, { name: newName });
      } catch (error) {
        console.error('Failed to update document name:', error);
        // Revert to original value on error
        setValue(initialName || '');
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditing(false);
  }, [isSaving, value, initialName, documentId, updateDocument]);

  const handleCancel = useCallback(() => {
    setValue(initialName || '');
    setIsEditing(false);
  }, [initialName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  return {
    value,
    isEditing,
    isSaving,
    setValue,
    startEditing,
    handleSave,
    handleCancel,
    handleKeyDown,
  };
}
```

2. Update `packages/documents/components/editable-document-title.tsx`:
   - Remove all useState, useEffect, and business logic
   - Use `useEditableTitle` hook
   - Simplify to presentational component

**Validation:**
- Title editing works
- Enter key saves
- Escape key cancels
- Click to edit works
- Auto-focus and select on edit works

---

### Task 8: Create useFileUpload Hook

**Objective:** Extract UploadForm business logic into a custom hook

**Files:**
- Create: `packages/documents/hooks/use-file-upload.ts`
- Edit: `packages/documents/components/upload-form.tsx`

**Implementation:**

1. Create new hook `packages/documents/hooks/use-file-upload.ts`:

```typescript
'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import GeminiService from '@/services/gemini';
import { useAccountContext } from '@/packages/account';

export interface UseFileUploadOptions {
  onTextExtracted?: (text: string) => void;
}

export interface UseFileUploadReturn {
  // State
  uploadedFiles: File[];
  extracting: boolean;
  gemini: GeminiService;

  // Actions
  handleFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => Promise<void>;
  resetFiles: () => void;
}

export function useFileUpload({
  onTextExtracted,
}: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { account } = useAccountContext();

  const gemini = useMemo(
    () => new GeminiService(account?.ai_providers?.gemini?.api_key || ''),
    [account?.ai_providers?.gemini?.api_key]
  );

  const [extracting, setExtracting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setUploadedFiles(files);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setExtracting(true);

    try {
      const extractedText = await gemini.extractText({ files: uploadedFiles });
      onTextExtracted?.(extractedText);
      setUploadedFiles([]); // Clear after success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  }, [uploadedFiles, gemini, onTextExtracted]);

  const resetFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  return {
    uploadedFiles,
    extracting,
    gemini,
    handleFilesSelected,
    handleSubmit,
    resetFiles,
  };
}
```

2. Update `packages/documents/components/upload-form.tsx`:
   - Remove useState, useMemo, and business logic
   - Use `useFileUpload` hook
   - Keep `formatFileSize` as local utility (presentation-specific)

**Validation:**
- File selection works
- Text extraction works
- Error handling works
- Loading states work

---

### Task 9: Update Hooks Index and Public API

**Objective:** Export new hooks in package public API

**Files:**
- Edit: `packages/documents/hooks/index.ts` (create if doesn't exist)
- Edit: `packages/documents/index.ts`

**Implementation:**

1. Create/Update `packages/documents/hooks/index.ts`:

```typescript
export * from './use-documents';
export * from './use-document';
export * from './use-create-document';
export * from './use-update-document';
export * from './use-delete-document';
export * from './use-document-editor';
export * from './use-editable-title';
export * from './use-file-upload';
```

2. Update `packages/documents/index.ts` to export from hooks/index:

```typescript
export * from '@/packages/documents/types';
export * from '@/packages/documents/hooks'; // Barrel export all hooks
export * from '@/packages/documents/components/document-list';
export * from '@/packages/documents/components/document-editor';
export * from '@/packages/documents/components/editable-document-title';
export * from '@/packages/documents/components/slides-presentation';

export { documentCollection } from '@/packages/documents/db';
```

**Validation:**
- All hooks are importable via package
- Build passes
- No circular dependencies

---

### Phase 3: Verification (Task 10)

### Task 10: Verify Consumers Still Work

**Objective:** Ensure existing consumers compile and work correctly

**Files:**
- Verify: `app/(app)/write/page.tsx`
- Verify: `app/(app)/write/[id]/page.tsx`

**Implementation:**

1. Run TypeScript compiler: `pnpm run build`
2. Check for any type errors in write pages
3. Verify no breaking changes to public API

**Validation:**
- No TypeScript errors
- Build completes successfully
- No warnings about missing types

**Expected Output:**
```
✓ app/(app)/write/page.tsx compiles
✓ app/(app)/write/[id]/page.tsx compiles
✓ Full build succeeds
```

---

## Integration & Validation

**After all tasks:**

1. **Build Validation:**
   ```bash
   pnpm run build
   ```
   Expected: Clean build with no errors

2. **Lint Validation:**
   ```bash
   pnpm run lint
   ```
   Expected: No linting errors or warnings

3. **Type Check:**
   ```bash
   pnpm exec tsc --noEmit
   ```
   Expected: No type errors

4. **Manual Testing:**
   - [ ] Start dev server: `pnpm run dev`
   - [ ] Navigate to `/write`
   - [ ] Create new document (click "New document" button)
   - [ ] Verify document appears in list
   - [ ] Click document to open editor
   - [ ] Edit document title (inline editable title)
   - [ ] Edit document content
   - [ ] Navigate away and back - changes should persist
   - [ ] Delete document from list
   - [ ] Verify document is removed

5. **Grep Verification:**
   ```bash
   # Verify no references to removed types
   grep -r "PutDocumentData" packages/documents/
   grep -r "PartialDocument" packages/documents/
   ```
   Expected: No results (types removed)

   ```bash
   # Verify new types are used
   grep -r "CreateDocumentData" packages/documents/
   grep -r "UpdateDocumentData" packages/documents/
   ```
   Expected: Found in types/index.ts and hook files

---

## Rollback

If any issues occur:

```bash
git reset --hard origin/main
```

This is a non-breaking refactor - all changes are internal type definitions. Consumers use the same API with better type safety.

---

## References

- Research: Research findings from comparing documents and keyboards packages
- Keyboards package: `/Users/raviatluri/work/september/packages/keyboards`
- Documents package: `/Users/raviatluri/work/september/packages/documents`
- TanStack DB docs: https://tanstack.com/db/

---

## Notes for Implementer

**Phase 1 - Type Refactor:**
- Don't copy-paste hook implementations - only change type signatures
- Keep implementation logic identical to avoid introducing bugs
- CreateDocumentData prevents passing id/timestamps on create (unless explicitly intended)
- UpdateDocumentData prevents modifying id or created_at
- This phase is purely a type refinement - no runtime changes

**Phase 2 - Logic Extraction:**
- Extract ALL business logic from components to hooks
- Components should primarily render UI and call hook methods
- Follow keyboards pattern: simple, focused components
- New hooks should have explicit return type interfaces
- Use useCallback for all event handlers in hooks
- Preserve exact functionality - this is a refactor, not a rewrite

**DRY:**
- Don't duplicate logic between hooks and components
- Reuse existing mutation hooks (useUpdateDocument, etc.)
- Extract shared utilities to separate functions

**YAGNI:**
- Don't add additional features (like autosave) unless implemented
- Don't change uuid to nanoid - acceptable variance between packages
- Don't modify db.ts or collection configuration - working correctly
- Only create hooks for components that have business logic

**Pitfalls:**
- Ensure all imports include new type names
- Don't accidentally break consumers by changing hook return types
- Remember to export all new hooks in hooks/index.ts
- Test each component after refactoring
- Watch for missing useCallback dependencies
- Preserve ref management (inputRef in EditableDocumentTitle)

**Type Safety:**
- All new hooks must have explicit return type interfaces
- Follow pattern: UseXxxReturn interface with hook signature
- Export both the hook and its return type interface

**Testing Strategy:**
- Test after each task completes
- Don't batch multiple tasks before testing
- Verify all user interactions still work
- Check error states and edge cases
