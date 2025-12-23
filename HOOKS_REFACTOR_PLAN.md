# Hooks Refactoring Plan

**Date:** 2025-12-23
**Objective:** Improve consistency, separation of concerns, and maintainability of hooks across all packages

## Executive Summary

A comprehensive review of hooks across all packages revealed significant opportunities for improvement:
- **Hook duplication** in audio and editor packages
- **Oversized hooks** violating single responsibility principle
- **Missing CRUD operations** across multiple packages
- **Inconsistent error handling** patterns
- **Business logic in components** that should be extracted to hooks

## Priority Matrix

### 🔴 Critical (High Impact, Quick Wins)

1. [Audio Package] Eliminate duplicate audio upload/download implementations
2. [Editor Package] Consolidate duplicate `useAutocomplete` hooks
3. [Chats Package] Extract database logic from `EditableChatTitle` component

### 🟠 High Priority (High Impact, Moderate Effort)

4. [Cloning Package] Split `useRecordingLogic` into focused hooks
5. [Speech Package] Split `use-voices-logic.ts` into smaller hooks
6. [Documents Package] Add single-entity query hooks
7. [Keyboards Package] Extract component business logic to hooks

### 🟡 Medium Priority (Quality Improvements)

8. [Account Package] Separate auth concerns from guest fallback logic
9. [AI Package] Split provider and hook into separate files
10. [Suggestions Package] Extract reusable `useDebounce` hook
11. Standardize error handling patterns across all packages
12. Add explicit return type interfaces to all hooks

### 🟢 Low Priority (Nice to Have)

13. Add JSDoc documentation to all hooks
14. Standardize file extensions (.tsx only when JSX is present)
15. Add unit tests for complex hooks

---

## Detailed Refactoring Plans

## 1. Audio Package - Eliminate Duplication

**Problem:** Three different implementations for audio upload/download with inconsistent behavior.

**Current State:**
```
packages/audio/hooks/
├── use-audio-storage.tsx       # Direct Triplit, base64 handling
├── use-db-audio-triplit.ts     # Wrapped Triplit, toast errors
└── use-db-audio-supabase.ts    # Supabase storage
```

**Refactoring Steps:**

1. **Decision:** Keep `use-db-audio-triplit.ts` and `use-db-audio-supabase.ts` as they follow the dual-provider pattern
2. **Remove:** `use-audio-storage.tsx` (redundant with triplit hook)
3. **Standardize base64 handling:**
   - Extract to `lib/audio-utils.ts`:
     - `parseBase64Audio(blob: string)`
     - `formatBase64Audio(blob: string, type: string)`
   - Use in both Triplit and Supabase hooks consistently
4. **Update:** `audio-provider.tsx` to remove references to `use-audio-storage`

**Files to Modify:**
- Delete: `packages/audio/hooks/use-audio-storage.tsx`
- Create: `packages/audio/lib/audio-utils.ts`
- Update: `packages/audio/hooks/use-db-audio-triplit.ts`
- Update: `packages/audio/hooks/use-db-audio-supabase.ts`
- Update: `packages/audio/components/audio-provider.tsx`

**Estimated Effort:** 2-3 hours

---

## 2. Editor Package - Consolidate Duplicate Hooks

**Problem:** `useAutocomplete` exists in two locations with different behavior.

**Current State:**
```
hooks/use-autocomplete.ts                    # Global, includes message history
packages/editor/hooks/use-autocomplete.ts    # Package, no message history
```

**Refactoring Steps:**

1. **Keep:** Global `hooks/use-autocomplete.ts` as single source of truth
2. **Add parameter:** `includeMessages?: boolean = false`
3. **Update implementation:**
   ```typescript
   export function useAutocomplete({ includeMessages = false }: { includeMessages?: boolean } = {})
   ```
4. **Delete:** `packages/editor/hooks/use-autocomplete.ts`
5. **Update imports** in editor components to use global hook
6. **Fix module-level state:** Move to React Context or proper cache

**Files to Modify:**
- Update: `hooks/use-autocomplete.ts`
- Delete: `packages/editor/hooks/use-autocomplete.ts`
- Update: `packages/editor/components/*` (update imports)
- Update: `packages/editor/index.ts`

**Estimated Effort:** 3-4 hours

---

## 3. Chats Package - Extract Component Logic to Hooks

**Problem:** `EditableChatTitle` component directly accesses database instead of using hooks.

**Current State:**
```typescript
// In component:
await chatCollection.update(chatId, draft => {
  draft.title = newTitle;
});
```

**Refactoring Steps:**

1. **Create:** `packages/chats/hooks/use-update-chat.ts`
   ```typescript
   export function useUpdateChat() {
     const updateChat = useCallback(async (id: string, updates: Partial<Chat>) => {
       const collection = useTriplitCollection('chats', chatSchema);
       await collection.update(id, draft => {
         Object.assign(draft, updates);
       });
     }, []);

     return { updateChat };
   }
   ```

2. **Create:** `packages/chats/hooks/use-delete-chat.ts`
3. **Create:** `packages/chats/hooks/use-delete-message.ts`
4. **Update:** `EditableChatTitle` to use `useUpdateChat`
5. **Export** new hooks from `packages/chats/index.ts`

**Files to Create:**
- `packages/chats/hooks/use-update-chat.ts`
- `packages/chats/hooks/use-delete-chat.ts`
- `packages/chats/hooks/use-delete-message.ts`

**Files to Update:**
- `packages/chats/components/editable-chat-title.tsx`
- `packages/chats/index.ts`

**Estimated Effort:** 2-3 hours

---

## 4. Cloning Package - Split Oversized Hook

**Problem:** `useRecordingLogic` handles 5 concerns in 183 lines.

**Current Responsibilities:**
1. Audio recording (MediaRecorder API)
2. Audio playback
3. Recording state management
4. Storage operations
5. Data loading

**Refactoring Steps:**

1. **Create:** `packages/cloning/hooks/use-media-recorder.ts`
   ```typescript
   export function useMediaRecorder(sampleId: string) {
     // MediaRecorder API, getUserMedia, stream handling
     return { startRecording, stopRecording, recordingStatus, error };
   }
   ```

2. **Create:** `packages/cloning/hooks/use-audio-playback.ts`
   ```typescript
   export function useAudioPlayback(recordings: Map<string, string>) {
     // Audio element creation and playback
     return { playRecording, stopPlaying, playbackStatus };
   }
   ```

3. **Create:** `packages/cloning/hooks/use-recording-state.ts`
   ```typescript
   export function useRecordingState() {
     // Recordings map, status per sample
     return { recordings, setRecordings, getStatus };
   }
   ```

4. **Update:** `packages/cloning/hooks/use-recording.ts` to compose smaller hooks
   ```typescript
   export function useRecordingLogic(): RecordingContextType {
     const mediaRecorder = useMediaRecorder();
     const playback = useAudioPlayback();
     const state = useRecordingState();
     // Orchestrate the three hooks
   }
   ```

5. **Rename:** `use-recording.ts` export from `useRecordingLogic` to `useRecording` (context hook to `useRecordingContext`)

**Files to Create:**
- `packages/cloning/hooks/use-media-recorder.ts`
- `packages/cloning/hooks/use-audio-playback.ts`
- `packages/cloning/hooks/use-recording-state.ts`

**Files to Update:**
- `packages/cloning/hooks/use-recording.ts`
- `packages/cloning/components/cloning-provider.tsx`

**Estimated Effort:** 4-6 hours

---

## 5. Speech Package - Split Form Logic Hook

**Problem:** `use-voices-logic.ts` handles too many concerns in 158 lines with 16 React hooks.

**Current Responsibilities:**
1. Form state management (react-hook-form)
2. Voice fetching logic
3. Provider selection logic
4. Search/filter state
5. Model selection logic
6. API key validation
7. Submit handling
8. Provider registry access

**Refactoring Steps:**

1. **Create:** `packages/speech/hooks/use-voice-fetching.ts`
   ```typescript
   export function useVoiceFetching(provider: AIProvider, apiKey?: string) {
     // Fetch voices, handle loading/error
     return { voices, isLoading, error, refetch };
   }
   ```

2. **Create:** `packages/speech/hooks/use-provider-models.ts`
   ```typescript
   export function useProviderModels(provider: AIProvider) {
     // Get available models for provider
     return { models, defaultModel };
   }
   ```

3. **Keep:** Form logic in `use-voice-settings.ts` (renamed from `use-voices-logic.ts`)
   - Only form state and submission
   - Compose the smaller hooks

4. **Rename:** `use-voices-logic.ts` → `use-voice-settings.ts`

**Files to Create:**
- `packages/speech/hooks/use-voice-fetching.ts`
- `packages/speech/hooks/use-provider-models.ts`

**Files to Rename:**
- `packages/speech/hooks/use-voices-logic.ts` → `use-voice-settings.ts`

**Files to Update:**
- `packages/speech/components/voices-form.tsx`
- `packages/speech/index.ts`

**Estimated Effort:** 4-5 hours

---

## 6. Documents Package - Add Single-Entity Hooks

**Problem:** No way to efficiently query a single document by ID; mutations mixed with queries.

**Current Issues:**
```typescript
// Issue 1: Fetching all documents to find one
const { documents } = useDocuments(); // Fetches ALL documents
const doc = documents.find(d => d.id === documentId); // Just to find one

// Issue 2: Mutations mixed with queries in useDocuments
// No separation between read and write operations
```

**Refactoring Steps:**

### Single Document Hook

1. **Create:** `packages/documents/hooks/use-document.ts`
   ```typescript
   export interface UseDocumentReturn {
     document: Document | undefined;
     isLoading: boolean;
     error?: { message: string };
   }

   export function useDocument(id?: string): UseDocumentReturn {
     const { data, isLoading, isError, error } = useLiveQuery(
       q => {
         let query = q.from({ items: documentCollection });
         if (id) {
           query = query.where(({ items }) => eq(items.id, id));
         }
         return query;
       },
       [id]
     );

     return {
       document: data?.[0],
       isLoading,
       error: isError ? { message: error?.message || 'Failed to fetch document' } : undefined
     };
   }
   ```

### Document Mutation Hooks

2. **Create:** `packages/documents/hooks/use-create-document.ts`
   ```typescript
   export interface UseCreateDocumentReturn {
     createDocument: (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Document>;
     isCreating: boolean;
   }

   export function useCreateDocument(): UseCreateDocumentReturn {
     const [isCreating, setIsCreating] = useState(false);
     const collection = useTriplitCollection('documents', documentSchema);

     const createDocument = useCallback(async (data) => {
       setIsCreating(true);
       try {
         const newDoc = await collection.insert({
           ...data,
           id: generateId(),
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
         });
         toast.success('Document created');
         return newDoc;
       } catch (err) {
         console.error('Failed to create document:', err);
         toast.error('Failed to create document');
         throw err;
       } finally {
         setIsCreating(false);
       }
     }, [collection]);

     return { createDocument, isCreating };
   }
   ```

3. **Create:** `packages/documents/hooks/use-update-document.ts`
   ```typescript
   export interface UseUpdateDocumentReturn {
     updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
     isUpdating: boolean;
   }

   export function useUpdateDocument(): UseUpdateDocumentReturn {
     const [isUpdating, setIsUpdating] = useState(false);
     const collection = useTriplitCollection('documents', documentSchema);

     const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
       setIsUpdating(true);
       try {
         await collection.update(id, draft => {
           Object.assign(draft, {
             ...updates,
             updatedAt: new Date().toISOString(),
           });
         });
         toast.success('Document updated');
       } catch (err) {
         console.error('Failed to update document:', err);
         toast.error('Failed to update document');
         throw err;
       } finally {
         setIsUpdating(false);
       }
     }, [collection]);

     return { updateDocument, isUpdating };
   }
   ```

4. **Create:** `packages/documents/hooks/use-delete-document.ts`
   ```typescript
   export interface UseDeleteDocumentReturn {
     deleteDocument: (id: string) => Promise<void>;
     isDeleting: boolean;
   }

   export function useDeleteDocument(): UseDeleteDocumentReturn {
     const [isDeleting, setIsDeleting] = useState(false);
     const collection = useTriplitCollection('documents', documentSchema);

     const deleteDocument = useCallback(async (id: string) => {
       setIsDeleting(true);
       try {
         await collection.delete(id);
         toast.success('Document deleted');
       } catch (err) {
         console.error('Failed to delete document:', err);
         toast.error('Failed to delete document');
         throw err;
       } finally {
         setIsDeleting(false);
       }
     }, [collection]);

     return { deleteDocument, isDeleting };
   }
   ```

### Refactor List Hooks

5. **Update:** `packages/documents/hooks/use-documents.ts` to be query-only
   - Remove any mutation logic
   - Keep only list fetching and filtering
   - Add explicit return type interface

**Note on Slides:** Slides are parsed from document content, not stored separately in the database. Therefore, slide operations are handled through document mutations. No separate slide mutation hooks are needed.

### Update Components

6. **Update component usage:**
    - `DocumentEditor` → use `useDocument(id)` instead of `useDocuments()`
    - `EditableDocumentTitle` → use `useUpdateDocument()` for mutations
    - `SlidesPresentation` → use `useDocument(id)` to get document, slides are parsed from content
    - Any create/delete operations → use dedicated mutation hooks

**Files to Create:**
- `packages/documents/hooks/use-document.ts`
- `packages/documents/hooks/use-create-document.ts`
- `packages/documents/hooks/use-update-document.ts`
- `packages/documents/hooks/use-delete-document.ts`

**Files to Update:**
- `packages/documents/hooks/use-documents.ts` (remove mutations, query-only)
- `packages/documents/components/document-editor.tsx`
- `packages/documents/components/editable-document-title.tsx`
- `packages/documents/components/slides-presentation.tsx`
- `packages/documents/index.ts` (export new hooks)

**Estimated Effort:** 3-4 hours

---

## 7. Keyboards Package - Extract Business Logic to Hooks

**Problem:** No `hooks/` directory; significant logic embedded in components.

**Current State:**
```
packages/keyboards/
├── components/
│   ├── circular-keyboard.tsx     # Contains shift state, stage size, hover logic
│   ├── qwerty-keyboard.tsx       # Contains shift state, key transformation
│   └── keyboard-context.tsx      # Contains useKeyboardContext hook
```

**Refactoring Steps:**

1. **Create:** `packages/keyboards/hooks/` directory

2. **Create:** `packages/keyboards/hooks/use-shift-state.ts`
   ```typescript
   export function useShiftState() {
     const [isShiftPressed, setIsShiftPressed] = useState(false);
     const toggleShift = useCallback(() => setIsShiftPressed(prev => !prev), []);
     const resetShift = useCallback(() => setIsShiftPressed(false), []);
     return { isShiftPressed, toggleShift, resetShift };
   }
   ```

3. **Create:** `packages/keyboards/hooks/use-stage-size.ts`
   ```typescript
   export function useStageSize() {
     const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
     // Resize handling logic
     return { stageSize };
   }
   ```

4. **Create:** `packages/keyboards/hooks/use-keyboard-interactions.ts`
   ```typescript
   export function useKeyboardInteractions() {
     const [hoveredKey, setHoveredKey] = useState<string | null>(null);
     // Hover and key press logic
     return { hoveredKey, setHoveredKey };
   }
   ```

5. **Move:** `useKeyboardContext` from `components/keyboard-context.tsx` to `hooks/use-keyboard-context.ts`

6. **Update components** to use extracted hooks

**Files to Create:**
- `packages/keyboards/hooks/use-shift-state.ts`
- `packages/keyboards/hooks/use-stage-size.ts`
- `packages/keyboards/hooks/use-keyboard-interactions.ts`
- `packages/keyboards/hooks/use-keyboard-context.ts`

**Files to Update:**
- `packages/keyboards/components/circular-keyboard.tsx`
- `packages/keyboards/components/qwerty-keyboard.tsx`
- `packages/keyboards/components/keyboard-context.tsx`
- `packages/keyboards/index.ts`

**Estimated Effort:** 3-4 hours

---

## 8. Account Package - Separate Auth Concerns

**Problem:** `use-auth.ts` mixes authentication with guest user fallback logic.

**Current Issue:**
```typescript
// In use-auth.ts:
useEffect(() => {
  if (!loading && !user) {
    setUser({ id: 'local-user', email: 'guest@september.to', ... } as User);
  }
}, [user, loading]);
```

**Refactoring Steps:**

1. **Update:** `packages/account/hooks/use-auth.ts`
   - Remove guest user fallback logic
   - Make it a pure Supabase auth adapter
   - Return only `{ user, loading }`

2. **Update:** `packages/account/components/context.tsx`
   - Add guest user fallback logic in `AccountProvider`
   - Handle orchestration at provider level

**Files to Update:**
- `packages/account/hooks/use-auth.ts`
- `packages/account/components/context.tsx`

**Estimated Effort:** 1-2 hours

---

## 9. AI Package - Split Provider and Hook

**Problem:** `use-ai-settings.tsx` contains both provider and hook in same file.

**Current State:**
```typescript
// In use-ai-settings.tsx:
export const AISettingsProvider = ...
export function useAISettings() { ... }
```

**Refactoring Steps:**

1. **Create:** `packages/ai/components/context.tsx`
   - Move `AISettingsProvider` here
   - Move helper functions (getSpeechConfig, etc.)

2. **Update:** `packages/ai/hooks/use-ai-settings.tsx`
   - Keep only `useAISettings` hook
   - Rename to `.ts` (no JSX)

3. **Update imports** across codebase

**Files to Create:**
- `packages/ai/components/context.tsx`

**Files to Update:**
- `packages/ai/hooks/use-ai-settings.tsx` → `use-ai-settings.ts`
- `packages/ai/index.ts`
- All consuming packages

**Estimated Effort:** 2-3 hours

---

## 10. Suggestions Package - Extract Reusable useDebounce

**Problem:** Debouncing logic implemented inline in `use-suggestions.ts`.

**Refactoring Steps:**

1. **Create:** `hooks/use-debounce.ts` (global hook)
   ```typescript
   export function useDebounce<T>(value: T, delay: number): T {
     const [debouncedValue, setDebouncedValue] = useState<T>(value);

     useEffect(() => {
       const timer = setTimeout(() => setDebouncedValue(value), delay);
       return () => clearTimeout(timer);
     }, [value, delay]);

     return debouncedValue;
   }
   ```

2. **Update:** `packages/suggestions/hooks/use-suggestions.ts`
   - Remove inline debouncing logic
   - Use `useDebounce` hook
   - Simplify implementation

3. **Benefit:** Can be reused in other packages (editor, search, etc.)

**Files to Create:**
- `hooks/use-debounce.ts`

**Files to Update:**
- `packages/suggestions/hooks/use-suggestions.ts`

**Estimated Effort:** 1 hour

---

## 11. Standardize Error Handling Patterns

**Problem:** Inconsistent error handling across packages.

**Current Patterns:**
- Some hooks throw errors
- Some return error objects
- Some use toast notifications
- Some use console.error only

**Refactoring Steps:**

1. **Document standard pattern in CLAUDE.md:**
   ```markdown
   ## Error Handling in Hooks

   **Query Hooks** (read operations):
   - Return error object: `{ data, isLoading, error }`
   - Error shape: `{ message: string }`

   **Mutation Hooks** (write operations):
   - Throw errors for component error boundaries
   - Use toast notifications for user feedback
   - Log to console for debugging

   **Pattern:**
   ```typescript
   try {
     await operation();
     toast.success('Success message');
   } catch (err) {
     console.error('Operation failed:', err);
     toast.error(err instanceof Error ? err.message : 'Operation failed');
     throw err; // Preserve for error boundaries
   }
   ```

2. **Update hooks** to follow this pattern:
   - Account hooks (add error states)
   - Documents hooks (add error states)
   - All mutation hooks (standardize pattern)

**Files to Update:**
- `CLAUDE.md` (add error handling section)
- All hook files across packages

**Estimated Effort:** 4-6 hours across all packages

---

## 12. Add Explicit Return Type Interfaces

**Problem:** Many hooks lack explicit return type interfaces.

**Current:**
```typescript
export function useDocuments() { ... }
```

**Target:**
```typescript
interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error?: { message: string };
}

export function useDocuments(): UseDocumentsReturn { ... }
```

**Refactoring Steps:**

1. **Create return type interfaces** for all hooks
2. **Add explicit return type annotations**
3. **Export interfaces** for TypeScript consumers

**Benefits:**
- Better IDE autocomplete
- Explicit contracts
- Easier to spot breaking changes

**Files to Update:**
- All hook files across all packages
- Add to `types/index.ts` in each package

**Estimated Effort:** 3-4 hours across all packages

---

## Implementation Strategy

### Phase 1: Quick Wins (Week 1)
- ✅ Audio package duplication (#1)
- ✅ Editor package duplication (#2)
- ✅ Chats component logic extraction (#3)
- ✅ Extract useDebounce (#10)

### Phase 2: Major Refactors (Week 2-3)
- ✅ Cloning package split (#4)
- ✅ Speech package split (#5)
- ✅ Documents CRUD hooks (#6)
- ✅ Keyboards logic extraction (#7)

### Phase 3: Quality Improvements (Week 4)
- ✅ Account auth separation (#8)
- ✅ AI provider split (#9)
- ✅ Standardize error handling (#11)
- ✅ Add return type interfaces (#12)

### Phase 4: Documentation & Testing
- ✅ Update README files in each package
- ✅ Add JSDoc to all hooks
- ✅ Add unit tests for complex hooks
- ✅ Update CLAUDE.md with patterns

---

## Testing Strategy

After each refactoring:

1. **Manual Testing:**
   - Test affected features in dev environment
   - Verify no regressions in UI/UX

2. **Type Checking:**
   ```bash
   pnpm run lint
   ```

3. **Build Verification:**
   ```bash
   pnpm run build
   ```

4. **Unit Tests** (where applicable):
   - Test hook logic in isolation
   - Mock dependencies
   - Test error scenarios

---

## Success Metrics

- [ ] Zero hook duplication across codebase
- [ ] All hooks follow single responsibility principle
- [ ] Consistent error handling pattern applied
- [ ] All packages have complete CRUD hooks
- [ ] All hooks have explicit return type interfaces
- [ ] Zero business logic in components (all in hooks)
- [ ] Package README files updated with hook documentation
- [ ] CLAUDE.md updated with hook patterns

---

## Rollback Plan

For each refactoring:
1. Create feature branch: `refactor/[package]-hooks`
2. Commit incrementally with clear messages
3. Test thoroughly before merging
4. Keep old code commented for one release cycle
5. Document breaking changes in commit messages

If issues arise:
```bash
git revert [commit-hash]
# or
git checkout main -- [file-path]
```

---

## Notes

- All refactorings maintain backward compatibility where possible
- Breaking changes should be documented
- Update imports across consuming code
- Consider creating codemods for large-scale import updates
- Each package refactoring is independent and can be done separately

---

**Last Updated:** 2025-12-23
**Status:** Planning Phase
**Owner:** Development Team
