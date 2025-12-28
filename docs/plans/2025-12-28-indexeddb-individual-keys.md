# IndexedDB Collection v2 Refactoring: Individual Key Storage

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-28
**Goal:** Refactor IndexedDB collection-v2 to store each item separately instead of all items in a single key
**Architecture:** Change from single "collection-data" key to individual tuple keys `[collectionId, encodedItemKey]`
**Tech Stack:** TypeScript, IndexedDB (via KVStore), BroadcastChannel, TanStack DB

**Success Criteria:**
- [ ] KVStore supports array/tuple keys
- [ ] All items stored as individual IndexedDB keys with collection prefix
- [ ] Cross-tab sync reads only changed keys (not entire collection)
- [ ] Zero API changes for collection consumers
- [ ] All TypeScript compilation passes
- [ ] Linter passes
- [ ] Manual testing confirms data persistence and sync

---

## Architecture Overview

### System Structure

**Current Implementation (BEFORE):**
```
IndexedDB Key: "collection-data"
Value: {
  "s:id1": { versionKey: "uuid1", data: {...} },
  "s:id2": { versionKey: "uuid2", data: {...} },
  ...
}
```

**New Implementation (AFTER):**
```
IndexedDB Key: ["chats", "s:id1"]  // Tuple: [collectionId, encodedItemKey]
Value: { versionKey: "uuid1", data: {...} }

IndexedDB Key: ["chats", "s:id2"]
Value: { versionKey: "uuid2", data: {...} }

IndexedDB Key: ["messages", "s:msg1"]
Value: { versionKey: "uuid3", data: {...} }
...
```

**Module Boundaries:**
- `kv-store.ts` - IndexedDB abstraction (MODIFIED - add array key support)
- `collection-v2.ts` - Main collection factory (MODIFIED - use tuple keys)
- BroadcastChannel - Cross-tab messaging (UNCHANGED)

**Why Tuple Keys:**

1. **Collection Isolation**: Each collection's items are namespaced by collection ID
2. **Efficient Scanning**: Can scan all items for a specific collection using IDBKeyRange
3. **Native IndexedDB Feature**: Array keys are natively supported and compared lexicographically
4. **Future-Proof**: Easy to add more key components (e.g., tenant, version)

### Data Flow Changes

**Write Path (BEFORE):**
1. Update `lastKnownData` Map with new item
2. Convert entire Map to object
3. Write entire object to single key: `kvStore.set('collection-data', entireObject)`
4. Broadcast message: `{type: 'change', key: itemKey, versionKey}`

**Write Path (AFTER):**
1. Update `lastKnownData` Map with new item
2. Extract only changed items
3. Use batch write with tuple keys: `kvStore.setMany([[['chats', 's:id'], storedItem], ...])`
4. Broadcast message: `{type: 'change', key: itemKey, versionKey}`

**Read Path (BEFORE):**
1. Read single key: `kvStore.get('collection-data')`
2. Parse entire object
3. Convert to Map of StoredItems

**Read Path (AFTER):**
1. Scan all keys with collection prefix: `kvStore.scanByPrefix(['chats'])`
2. For each key, parse StoredItem
3. Convert to Map of StoredItems

**Cross-Tab Sync (BEFORE):**
1. Receive broadcast: `{type: 'change', key: 'id1', versionKey: 'uuid-new'}`
2. Re-read ENTIRE collection from `collection-data` key
3. Compare all version keys
4. Apply changes

**Cross-Tab Sync (AFTER):**
1. Receive broadcast: `{type: 'change', key: 'id1', versionKey: 'uuid-new'}`
2. Read ONLY changed item: `kvStore.get(['chats', 's:id1'])`
3. Compare single version key
4. Apply change if different

### Key Design Decisions

1. **Tuple Key Format**: `[collectionId, encodedItemKey]`
   - `collectionId`: From config (e.g., "chats", "messages", "keyboards")
   - `encodedItemKey`: Existing format with type prefix (e.g., "s:user-123", "n:42")

2. **No Migration**: This is a clean implementation with no backward compatibility
   - Users will start fresh with the new format
   - No legacy "collection-data" key support needed

3. **Batch Operations**: Use `kvStore.setMany()` and `kvStore.deleteMany()` with tuple keys
   - IndexedDB transactions are already atomic, batching improves performance

4. **KVStore Key Type**: Generic key type supporting both string and array keys
   - Backward compatible - string keys still work
   - New tuple keys for collection items

### Integration Points

**TanStack DB Collection Interface:**
- **UNCHANGED** - Same `CollectionConfig<T, TKey, TSchema, Utils>` interface
- Sync interface: `sync(params)` - UNCHANGED
- Mutation handlers: `onInsert/onUpdate/onDelete` - UNCHANGED
- Utils: `clearStorage/getStorageSize/acceptMutations` - Implementation changes only

**KVStore Integration (Modified Methods):**
```typescript
// Key type now supports arrays
type IDBValidKey = string | number | Array<string | number>

// Single operations (updated signatures)
get(key: IDBValidKey): Promise<T | undefined>
set(key: IDBValidKey, value: T): Promise<void>
delete(key: IDBValidKey): Promise<void>

// Batch operations (updated signatures)
getMany(keys: IDBValidKey[]): Promise<Array<T | undefined>>
setMany(entries: Array<[IDBValidKey, T]>): Promise<void>
deleteMany(keys: IDBValidKey[]): Promise<void>

// New method for scanning by prefix
scanByPrefix(prefix: IDBValidKey[]): AsyncIterable<[IDBValidKey, T]>
```

**BroadcastChannel Protocol:**
- **UNCHANGED** - Same message format:
  - `{ type: 'change', key: TKey, versionKey: string }`
  - `{ type: 'clear' }`

### Error Handling Strategy

**Same as Before:**
- Use TanStack `SerializationError` for JSON issues
- Log warnings for invalid data formats
- Return empty Map on load failures
- Re-throw errors from mutations (for TanStack to handle)

**New Error Cases:**
- Scan failures: Log error, return empty Map

### Testing Strategy

**Integration Tests (Manual):**
- Fresh install with new format
- Cross-tab sync with new format
- Large collection (100+ items) performance
- Multiple collections in same database

**No Breaking Changes:**
- All 5 existing collections continue working
- No consumer code changes needed

---

## Interface Definitions

### Module: KVStore

**File:** `lib/indexeddb/kv-store.ts`

**Updated Types:**

```typescript
/**
 * Valid IndexedDB key types
 * Supports string, number, and arrays (tuples)
 */
export type IDBValidKey = string | number | Array<string | number>;

export class KVStore<T = unknown> {
  // Updated method signatures to accept IDBValidKey
  async get(key: IDBValidKey): Promise<T | undefined>
  async set(key: IDBValidKey, value: T): Promise<void>
  async delete(key: IDBValidKey): Promise<void>
  async has(key: IDBValidKey): Promise<boolean>
  async getMany(keys: IDBValidKey[]): Promise<Array<T | undefined>>
  async setMany(entries: Array<[IDBValidKey, T]>): Promise<void>
  async deleteMany(keys: IDBValidKey[]): Promise<void>

  // New method for prefix scanning with array keys
  async *scanByPrefix(prefix: Array<string | number>): AsyncIterable<[IDBValidKey, T]>

  // Updated return types
  async keys(): Promise<IDBValidKey[]>
  async entries(): Promise<Array<[IDBValidKey, T]>>
}
```

### Module: IndexedDB Collection v2

**File:** `lib/indexeddb/collection-v2.ts`

**NO API CHANGES** - All exported interfaces remain identical:

```typescript
// UNCHANGED
export interface IndexedDBCollectionConfigV2<...> { ... }
export interface IndexedDBCollectionUtilsV2 extends UtilsRecord { ... }
export interface Parser { ... }
export function indexedDBCollectionOptionsV2<...>(...): CollectionConfig<...> { ... }
```

**Internal Changes Only:**

```typescript
// UNCHANGED (internal)
interface StoredItem<T> {
  versionKey: string;
  data: T;
}

// NEW (internal)
/**
 * Create a tuple key for an individual item
 * Format: [collectionId, encodedItemKey]
 */
function createItemKey(collectionId: string, encodedKey: string): [string, string] {
  return [collectionId, encodedKey];
}

/**
 * Extract the encoded item key from a tuple key
 */
function extractEncodedKey(tupleKey: [string, string]): string {
  return tupleKey[1];
}
```

---

## Task Breakdown

### Task 1: Update KVStore Key Type to Support Arrays

**Objective:** Change KVStore to accept array/tuple keys in addition to string keys

**Files:**
- Edit: `lib/indexeddb/kv-store.ts`

**Implementation:**

Add type definition at the top of the file (after imports, around line 7):

```typescript
/**
 * Valid IndexedDB key types
 * Supports string, number, and arrays (tuples) for compound keys
 *
 * Examples:
 *   - "simple-key"           // String key
 *   - 42                     // Number key
 *   - ["chats", "s:id1"]     // Tuple key for collection items
 */
export type IDBValidKey = string | number | Array<string | number>;
```

Update method signatures throughout the class:

```typescript
// Change all `key: string` parameters to `key: IDBValidKey`
async get(key: IDBValidKey): Promise<T | undefined>
async set(key: IDBValidKey, value: T): Promise<void>
async delete(key: IDBValidKey): Promise<void>
async has(key: IDBValidKey): Promise<boolean>
async update(key: IDBValidKey, updater: (oldValue: T | undefined) => T): Promise<void>

// Update batch methods
async getMany(keys: IDBValidKey[]): Promise<Array<T | undefined>>
async setMany(entries: Array<[IDBValidKey, T]>): Promise<void>
async deleteMany(keys: IDBValidKey[]): Promise<void>

// Update return types
async keys(): Promise<IDBValidKey[]>
async entries(): Promise<Array<[IDBValidKey, T]>>
```

**Validation:**
- All existing string key usage continues to work
- Array keys can be passed to all methods
- TypeScript compiles without errors

---

### Task 2: Add scanByPrefix Method to KVStore

**Objective:** Add a method to scan all keys that start with a given array prefix

**Files:**
- Edit: `lib/indexeddb/kv-store.ts`

**Implementation:**

Add after the existing `scan` method (around line 378):

```typescript
/**
 * Iterate over all entries with an array key prefix
 * Uses IDBKeyRange to efficiently scan keys starting with the prefix
 *
 * Example:
 *   // Scan all items in the "chats" collection
 *   for await (const [key, value] of kvStore.scanByPrefix(['chats'])) {
 *     console.log(key, value); // key = ['chats', 's:id1'], value = {...}
 *   }
 */
async *scanByPrefix(prefix: Array<string | number>): AsyncIterable<[IDBValidKey, T]> {
  const db = await this.getDB();
  const transaction = db.transaction(this.storeName, 'readonly');
  const store = transaction.objectStore(this.storeName);

  // Create key range for array prefix
  // Lower bound: prefix array (e.g., ['chats'])
  // Upper bound: prefix array with max value appended (e.g., ['chats', []])
  // In IndexedDB, arrays are compared element by element, and [] is greater than any string/number
  const lower = prefix;
  const upper = [...prefix, []]; // Empty array is greater than any string/number in IDB comparison
  const keyRange = IDBKeyRange.bound(lower, upper, false, true);

  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const request = store.getAllKeys(keyRange);
    request.onsuccess = () => resolve(request.result as IDBValidKey[]);
    request.onerror = () => reject(request.error);
  });

  const values = await new Promise<T[]>((resolve, reject) => {
    const request = store.getAll(keyRange);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });

  for (let i = 0; i < keys.length; i++) {
    yield [keys[i], values[i]];
  }
}
```

**Algorithm:**

1. Get database connection
2. Create transaction on object store
3. Build IDBKeyRange for prefix:
   - Lower bound: the prefix array itself (e.g., `['chats']`)
   - Upper bound: prefix with empty array appended (e.g., `['chats', []]`)
   - Note: In IndexedDB key comparison, `[]` (empty array) is greater than any string or number
4. Get all keys and values in range
5. Yield each [key, value] pair

**Validation:**
- Correctly scans all keys starting with prefix
- Excludes keys from other collections
- Works with empty collections (yields nothing)
- TypeScript compiles without errors

---

### Task 3: Add Tuple Key Helper Functions to Collection

**Objective:** Define helper functions for creating and parsing tuple keys

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Add after existing helper functions (after `decodeStorageKey`, around line 95):

```typescript
// ============================================================================
// Tuple Key Management
// ============================================================================

/**
 * Create a tuple key for an individual item in a collection
 * Format: [collectionId, encodedItemKey]
 *
 * Examples:
 *   - createItemKey('chats', 's:user-123') → ['chats', 's:user-123']
 *   - createItemKey('messages', 'n:42') → ['messages', 'n:42']
 */
function createItemKey(collectionId: string, encodedKey: string): [string, string] {
  return [collectionId, encodedKey];
}

/**
 * Extract the encoded item key from a tuple key
 * Returns the second element of the tuple
 *
 * Examples:
 *   - extractEncodedKey(['chats', 's:user-123']) → 's:user-123'
 *   - extractEncodedKey(['messages', 'n:42']) → 'n:42'
 */
function extractEncodedKey(tupleKey: [string, string]): string {
  return tupleKey[1];
}
```

**Validation:**
- Functions compile with no errors
- Functions are appropriately scoped (not exported)
- Examples in comments are accurate

---

### Task 4: Refactor loadFromStorage to Use Tuple Keys

**Objective:** Change loadFromStorage to scan individual items using collection prefix

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace existing `loadFromStorage` function (lines 121-151):

```typescript
/**
 * Load data from IndexedDB using individual tuple keys
 * Scans all items with the collection's prefix
 */
async function loadFromStorage<T extends object>(
  kvStore: KVStore<StoredItem<T>> | null,
  collectionId: string
): Promise<Map<string | number, StoredItem<T>>> {
  if (!kvStore) {
    return new Map();
  }

  try {
    const dataMap = new Map<string | number, StoredItem<T>>();

    // Scan all keys with collection prefix
    for await (const [tupleKey, value] of kvStore.scanByPrefix([collectionId])) {
      if (value && typeof value === 'object' && 'versionKey' in value && 'data' in value) {
        const storedItem = value as StoredItem<T>;
        const encodedKey = extractEncodedKey(tupleKey as [string, string]);
        const decodedKey = decodeStorageKey(encodedKey);
        dataMap.set(decodedKey, storedItem);
      } else {
        console.warn('[IndexedDBCollectionV2] Invalid StoredItem format for key:', tupleKey);
      }
    }

    return dataMap;
  } catch (error) {
    console.warn('[IndexedDBCollectionV2] Error loading data:', error);
    return new Map();
  }
}
```

**Signature Change:**
- Add `collectionId: string` parameter

**Algorithm:**

1. Check if kvStore is null (SSR) → return empty Map
2. Scan all keys with collection prefix using `kvStore.scanByPrefix([collectionId])`
3. For each [tupleKey, value]:
   - Validate StoredItem format
   - Extract encoded key from tuple
   - Decode to original key type
   - Add to Map
4. Return Map
5. On error: Log warning, return empty Map

**Validation:**
- Loads all items for the specific collection
- Ignores items from other collections
- Skips invalid items with warnings
- Returns empty Map on errors (SSR-safe)

---

### Task 5: Refactor saveToStorage to Use Tuple Keys

**Objective:** Change saveToStorage to write items with tuple keys

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace existing `saveToStorage` function (lines 156-174):

```typescript
/**
 * Save specific items to IndexedDB using tuple keys
 * Uses batch operation for efficiency
 *
 * @param collectionId - The collection's ID for the key prefix
 * @param changedKeys - Optional set of keys that changed (for optimization)
 *                      If not provided, saves all items in dataMap
 */
async function saveToStorage<T extends object>(
  kvStore: KVStore<StoredItem<T>> | null,
  collectionId: string,
  dataMap: Map<string | number, StoredItem<T>>,
  changedKeys?: Set<string | number>
): Promise<void> {
  if (!kvStore) {
    return;
  }

  try {
    const entries: Array<[[string, string], StoredItem<T>]> = [];

    // If changedKeys provided, save only those items
    // Otherwise save all items
    const keysToSave = changedKeys || dataMap.keys();

    for (const key of keysToSave) {
      const storedItem = dataMap.get(key);
      if (storedItem) {
        const encodedKey = encodeStorageKey(key);
        const tupleKey = createItemKey(collectionId, encodedKey);
        entries.push([tupleKey, storedItem]);
      }
    }

    if (entries.length > 0) {
      await kvStore.setMany(entries);
    }
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error saving data:', error);
    throw error;
  }
}
```

**Signature Change:**
- Add `collectionId: string` parameter (second position)

**Algorithm:**

1. Check if kvStore is null (SSR) → return
2. Initialize empty entries array
3. Determine keys to save:
   - If changedKeys provided → use those
   - Otherwise → use all keys from dataMap
4. For each key to save:
   - Get storedItem from dataMap
   - If exists:
     - Encode key
     - Create tuple key with collection ID
     - Add to entries array
5. If entries not empty:
   - Batch write: `await kvStore.setMany(entries)`
6. On error: Log and re-throw

**Validation:**
- Saves all items when changedKeys not provided
- Saves only specified items when changedKeys provided
- Uses tuple keys with collection prefix
- Uses batch operation for efficiency
- Errors propagate correctly

---

### Task 6: Optimize processStorageChanges to Read Only Changed Key

**Objective:** When receiving cross-tab sync message, read only the changed item using tuple key

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace `processStorageChanges` function inside `createIndexedDBSync` (lines 227-248):

```typescript
/**
 * Process storage changes from other tabs
 * Optimized to read only the specific changed item using tuple key
 */
const processStorageChanges = async (changedKey?: string | number) => {
  if (!syncParams) return;

  const { begin, write, commit } = syncParams;

  try {
    if (changedKey !== undefined) {
      // Optimized path: Read only the changed item
      const encodedKey = encodeStorageKey(changedKey);
      const tupleKey = createItemKey(collectionId, encodedKey);
      const newStoredItem = await kvStore?.get(tupleKey);

      const oldStoredItem = lastKnownData.get(changedKey);

      // Determine change type
      if (!oldStoredItem && newStoredItem) {
        // Insert
        if (newStoredItem && typeof newStoredItem === 'object' &&
            'versionKey' in newStoredItem && 'data' in newStoredItem) {
          begin();
          write({ type: 'insert', value: newStoredItem.data });
          commit();
          lastKnownData.set(changedKey, newStoredItem as StoredItem<T>);
        }
      } else if (oldStoredItem && newStoredItem) {
        // Update (only if versionKey changed)
        if (newStoredItem && typeof newStoredItem === 'object' &&
            'versionKey' in newStoredItem && 'data' in newStoredItem) {
          const typedNewItem = newStoredItem as StoredItem<T>;
          if (oldStoredItem.versionKey !== typedNewItem.versionKey) {
            begin();
            write({ type: 'update', value: typedNewItem.data });
            commit();
            lastKnownData.set(changedKey, typedNewItem);
          }
        }
      } else if (oldStoredItem && !newStoredItem) {
        // Delete
        begin();
        write({ type: 'delete', value: oldStoredItem.data });
        commit();
        lastKnownData.delete(changedKey);
      }
    } else {
      // Fallback: Full reload (for 'clear' messages or unknown changes)
      const newData = await loadFromStorage<T>(kvStore, collectionId);
      const changes = findChanges(lastKnownData, newData);

      if (changes.length > 0) {
        begin();
        changes.forEach(({ type, value }) => {
          if (value) {
            write({ type: type as 'insert' | 'update' | 'delete', value });
          }
        });
        commit();

        lastKnownData.clear();
        newData.forEach((storedItem, key) => {
          lastKnownData.set(key, storedItem);
        });
      }
    }
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error processing storage changes:', error);
  }
};
```

**Key Changes:**
- Use `createItemKey(collectionId, encodedKey)` to build tuple key
- Pass `collectionId` to `loadFromStorage()` in fallback path

**Performance Improvement:**
- BEFORE: Always read entire collection (100+ items)
- AFTER: Read only changed item (1 item) when key is known

**Validation:**
- Correctly handles insert/update/delete for single item
- Falls back to full reload when changedKey not provided
- Version key comparison prevents unnecessary updates
- Errors logged but don't crash sync

---

### Task 7: Update BroadcastChannel Message Handler

**Objective:** Pass changed key to processStorageChanges for optimization

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Update the BroadcastChannel onmessage handler inside `createIndexedDBSync` (around lines 296-303):

```typescript
if (channel) {
  channel.onmessage = async (event: MessageEvent<IndexedDBSyncMessage<string | number>>) => {
    const msg = event.data;
    if (msg.type === 'change') {
      // Pass the specific changed key for optimized reading
      await processStorageChanges(msg.key);
    } else if (msg.type === 'clear') {
      // No specific key for clear, do full reload
      await processStorageChanges();
    }
  };
}
```

**Changes:**
- Add parameter to `processStorageChanges(msg.key)` for 'change' messages
- Call without parameter `processStorageChanges()` for 'clear' messages

**Validation:**
- Change messages trigger optimized single-item read
- Clear messages trigger full reload
- TypeScript types match

---

### Task 8: Update Mutation Handlers to Use Tuple Keys

**Objective:** Update insert/update/delete handlers to use tuple keys and track changed keys

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Update all three mutation handlers in `createMutationHandlers`:

**wrappedOnInsert (around lines 334-376):**

```typescript
const wrappedOnInsert = async (
  params: InsertMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
) => {
  params.transaction.mutations.forEach(mutation => {
    validateJsonSerializable(parser, mutation.modified, 'insert');
  });

  let handlerResult: Record<string, unknown> = {};
  if (config.onInsert) {
    handlerResult =
      ((await config.onInsert(params as InsertMutationFnParams<T, TKey, UtilsRecord>)) as Record<
        string,
        unknown
      >) ?? {};
  }

  // Track changed keys for optimization
  const changedKeys = new Set<string | number>();

  params.transaction.mutations.forEach(mutation => {
    const storedItem: StoredItem<T> = {
      versionKey: generateUuid(),
      data: mutation.modified,
    };
    lastKnownData.set(mutation.key, storedItem);
    changedKeys.add(mutation.key);
  });

  // Save only changed items with tuple keys
  await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);

  if (channel) {
    params.transaction.mutations.forEach(mutation => {
      const storedItem = lastKnownData.get(mutation.key);
      if (storedItem) {
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: storedItem.versionKey,
        } as IndexedDBSyncMessage<TKey>);
      }
    });
  }

  sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

  return handlerResult;
};
```

**wrappedOnUpdate (around lines 378-420):**

```typescript
const wrappedOnUpdate = async (
  params: UpdateMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
) => {
  params.transaction.mutations.forEach(mutation => {
    validateJsonSerializable(parser, mutation.modified, 'update');
  });

  let handlerResult: Record<string, unknown> = {};
  if (config.onUpdate) {
    handlerResult =
      ((await config.onUpdate(params as UpdateMutationFnParams<T, TKey, UtilsRecord>)) as Record<
        string,
        unknown
      >) ?? {};
  }

  // Track changed keys for optimization
  const changedKeys = new Set<string | number>();

  params.transaction.mutations.forEach(mutation => {
    const storedItem: StoredItem<T> = {
      versionKey: generateUuid(),
      data: mutation.modified,
    };
    lastKnownData.set(mutation.key, storedItem);
    changedKeys.add(mutation.key);
  });

  // Save only changed items with tuple keys
  await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);

  if (channel) {
    params.transaction.mutations.forEach(mutation => {
      const storedItem = lastKnownData.get(mutation.key);
      if (storedItem) {
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: storedItem.versionKey,
        } as IndexedDBSyncMessage<TKey>);
      }
    });
  }

  sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

  return handlerResult;
};
```

**wrappedOnDelete (around lines 422-453):**

```typescript
const wrappedOnDelete = async (
  params: DeleteMutationFnParams<T, TKey, IndexedDBCollectionUtilsV2>
) => {
  let handlerResult: Record<string, unknown> = {};
  if (config.onDelete) {
    handlerResult =
      ((await config.onDelete(params as DeleteMutationFnParams<T, TKey, UtilsRecord>)) as Record<
        string,
        unknown
      >) ?? {};
  }

  // Track deleted keys
  const deletedKeys: Array<string | number> = [];

  params.transaction.mutations.forEach(mutation => {
    lastKnownData.delete(mutation.key);
    deletedKeys.push(mutation.key);
  });

  // Delete items from storage using tuple keys
  if (kvStore && deletedKeys.length > 0) {
    const tupleKeysToDelete = deletedKeys.map(key =>
      createItemKey(collectionId, encodeStorageKey(key))
    );
    await kvStore.deleteMany(tupleKeysToDelete);
  }

  if (channel) {
    params.transaction.mutations.forEach(mutation => {
      channel.postMessage({
        type: 'change',
        key: mutation.key,
        versionKey: '',
      } as IndexedDBSyncMessage<TKey>);
    });
  }

  sync.confirmOperationsSync(params.transaction.mutations as Array<PendingMutation<T>>);

  return handlerResult;
};
```

**Key Changes:**
1. **Insert/Update**: Pass `collectionId` to `saveToStorage()`
2. **Delete**: Use `createItemKey()` to build tuple keys for deletion

**Validation:**
- Only changed items are written to IndexedDB
- Deletions use batch delete operation with tuple keys
- All handlers remain async
- BroadcastChannel messages unchanged

---

### Task 9: Update getStorageSize Utility

**Objective:** Calculate storage size by iterating items with collection prefix

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace `getStorageSize` function inside `createUtilities` (lines 493-508):

```typescript
const getStorageSize = async (): Promise<number> => {
  if (!kvStore) return 0;

  try {
    // Load all items for this collection
    const data = await loadFromStorage<T>(kvStore, collectionId);

    // Calculate total size by stringifying all items
    let totalSize = 0;

    data.forEach((storedItem, key) => {
      const encodedKey = encodeStorageKey(key);
      const tupleKey = createItemKey(collectionId, encodedKey);

      // Size = key size + value size
      const serializedKey = parser.stringify(tupleKey);
      const serializedItem = parser.stringify(storedItem);
      totalSize += new Blob([serializedKey]).size;
      totalSize += new Blob([serializedItem]).size;
    });

    return totalSize;
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error getting storage size:', error);
    return 0;
  }
};
```

**Changes:**
- Pass `collectionId` to `loadFromStorage()`
- Use tuple key for size calculation

**Validation:**
- Returns accurate size including key and value sizes
- Handles empty collection (returns 0)
- Errors return 0 instead of throwing

---

### Task 10: Update acceptMutations Utility

**Objective:** Update acceptMutations to use tuple keys for save/delete operations

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace `acceptMutations` function inside `createUtilities` (lines 510-557):

```typescript
const acceptMutations = async (transaction: {
  mutations: Array<PendingMutation<Record<string, unknown>>>;
}): Promise<void> => {
  const collection = sync.getCollection();
  const collectionMutations = transaction.mutations.filter(m => {
    if (collection && m.collection === collection) {
      return true;
    }
    return (m.collection as { id?: string }).id === collectionId;
  });

  if (collectionMutations.length === 0) {
    return;
  }

  // Validate all mutations can be serialized
  for (const mutation of collectionMutations) {
    if (mutation.type === 'insert' || mutation.type === 'update') {
      validateJsonSerializable(parser, mutation.modified, mutation.type);
    }
  }

  // Track changes for optimization
  const changedKeys = new Set<string | number>();
  const deletedKeys: Array<string | number> = [];

  // Apply mutations to lastKnownData
  for (const mutation of collectionMutations) {
    if (mutation.type === 'insert' || mutation.type === 'update') {
      const storedItem: StoredItem<Record<string, unknown>> = {
        versionKey: generateUuid(),
        data: mutation.modified,
      };
      lastKnownData.set(mutation.key as string | number, storedItem as StoredItem<T>);
      changedKeys.add(mutation.key as string | number);
    } else if (mutation.type === 'delete') {
      lastKnownData.delete(mutation.key as string | number);
      deletedKeys.push(mutation.key as string | number);
    }
  }

  // Save changed items with tuple keys
  if (changedKeys.size > 0) {
    await saveToStorage(kvStore, collectionId, lastKnownData, changedKeys);
  }

  // Delete removed items with tuple keys
  if (kvStore && deletedKeys.length > 0) {
    const tupleKeysToDelete = deletedKeys.map(key =>
      createItemKey(collectionId, encodeStorageKey(key))
    );
    await kvStore.deleteMany(tupleKeysToDelete);
  }

  // Broadcast changes
  if (channel) {
    for (const mutation of collectionMutations) {
      const storedItem = lastKnownData.get(mutation.key as string | number);
      channel.postMessage({
        type: 'change',
        key: mutation.key,
        versionKey: storedItem?.versionKey ?? '',
      } as IndexedDBSyncMessage<string | number>);
    }
  }

  sync.confirmOperationsSync(collectionMutations as unknown as Array<PendingMutation<T>>);
};
```

**Changes:**
- Pass `collectionId` to `saveToStorage()`
- Use `createItemKey()` for deletion tuple keys

**Validation:**
- Handles mixed insert/update/delete in single transaction
- Uses tuple keys for all storage operations
- All mutations confirmed correctly

---

### Task 11: Update clearStorage Utility

**Objective:** Clear only items for this collection (not entire store)

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Replace `clearStorage` function inside `createUtilities` (lines 477-491):

```typescript
const clearStorage = async (): Promise<void> => {
  if (!kvStore) return;

  try {
    // Scan and delete only items for this collection
    const keysToDelete: Array<[string, string]> = [];

    for await (const [tupleKey] of kvStore.scanByPrefix([collectionId])) {
      keysToDelete.push(tupleKey as [string, string]);
    }

    if (keysToDelete.length > 0) {
      await kvStore.deleteMany(keysToDelete);
    }

    lastKnownData.clear();

    if (channel) {
      channel.postMessage({ type: 'clear' } as IndexedDBSyncMessage<TKey>);
    }
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error clearing storage:', error);
    throw error;
  }
};
```

**Key Change:**
- Instead of `kvStore.clear()` (which clears ALL collections), scan and delete only this collection's items
- This is important since multiple collections may share the same database

**Validation:**
- Clears only items for this collection
- Does not affect other collections in the same database
- Clears lastKnownData Map
- Broadcasts clear message
- Errors propagate correctly

---

### Task 12: Update Initial Sync to Pass collectionId

**Objective:** Ensure collectionId is passed to loadFromStorage during initial sync

**Files:**
- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

Update the `createIndexedDBSync` function where initial data is loaded (around line 270-290):

Find the line that calls `loadFromStorage`:

```typescript
// OLD
const initialData = await loadFromStorage<T>(kvStore);

// NEW
const initialData = await loadFromStorage<T>(kvStore, collectionId);
```

Ensure `collectionId` is accessible in the sync function scope. It should already be available from the config.

**Validation:**
- Initial sync loads only items for this collection
- TypeScript compiles without errors

---

## Integration & Validation

**After all tasks:**

### 1. TypeScript Compilation

```bash
cd /Users/raviatluri/work/september
pnpm run build
# Should compile with no errors
```

### 2. Linter

```bash
pnpm run lint
# Should pass with no warnings
```

### 3. Manual Testing

**Test 1: Fresh Install**

```typescript
// In browser console
// Clear any existing data
indexedDB.deleteDatabase('app-chats');

// Refresh page
// Create chat
// Check IndexedDB:
//   - Should see keys like ["chats", "s:<chat-id>"]
//   - Should NOT see "collection-data" key
```

**Test 2: Multiple Collections in Same Database**

```typescript
// If collections share a database, verify isolation
// Create items in chats collection
// Create items in messages collection
// Verify each collection only sees its own items
// Clear one collection - other should be unaffected
```

**Test 3: Cross-Tab Sync (Optimized)**

```typescript
// Tab 1: Open app
// Tab 2: Open app

// Tab 1: Create a chat
// Check Tab 2: Chat appears (cross-tab sync works)

// In Tab 1, open DevTools
// In Tab 2: Update the chat

// Check Tab 1:
//   - Chat updates (sync works)
//   - VERIFY: Only single item was read (not entire collection)
//   - Check console for any errors
```

**Test 4: Large Collection Performance**

```typescript
// Create 100+ chats
// Measure time for:
//   - Initial load
//   - Single insert
//   - Single update
//   - Cross-tab sync

// Expected: Similar or better performance
// Cross-tab sync should be faster (reads 1 item vs 100+)
```

**Test 5: All Consumers Work**

```bash
# Test all 5 collections:
# - account (packages/account/db.ts)
# - chats (packages/chats/db.ts)
# - messages (packages/chats/db.ts)
# - documents (packages/documents/db.ts)
# - keyboards (packages/keyboards/db.ts)

# For each:
# - Create item
# - Update item
# - Delete item
# - Verify persistence (refresh page)
# - Verify cross-tab sync
```

**Performance Targets:**
- Initial load: < 200ms for 100 items
- Insert/Update/Delete: < 50ms per operation
- Cross-tab sync: < 100ms for single item change

**Data Integrity:**
- All version keys preserved
- All item data intact
- Keys properly encoded/decoded
- Collections properly isolated

---

## Rollback

If implementation fails:

```bash
git checkout lib/indexeddb/kv-store.ts lib/indexeddb/collection-v2.ts
```

To clear databases and start fresh:

```javascript
// In browser console, clear ALL collection databases
const databases = ['app-chats', 'app-messages', 'app-documents', 'app-keyboards', 'app-account'];
databases.forEach(db => indexedDB.deleteDatabase(db));

// Refresh page - collections will reinitialize with fresh data
```

---

## References

- Current Implementation: `/Users/raviatluri/work/september/lib/indexeddb/collection-v2.ts`
- KVStore API: `/Users/raviatluri/work/september/lib/indexeddb/kv-store.ts`
- Consumer Example: `/Users/raviatluri/work/september/packages/chats/db.ts`
- TanStack DB Docs: `node_modules/@tanstack/db/`
- IndexedDB Key Comparison: https://w3c.github.io/IndexedDB/#key-construct

---

## Notes for Implementer

**DRY:**
- Reuse existing helper functions (encodeStorageKey, decodeStorageKey)
- New helpers: createItemKey, extractEncodedKey
- Don't duplicate validation or error handling logic

**YAGNI:**
- Don't add features beyond the spec
- No backward compatibility needed
- Don't optimize for edge cases that haven't occurred

**Pitfalls:**

1. **Tuple Key Format**: Always use `[collectionId, encodedKey]` format
   - Use `createItemKey()` helper, never build manually

2. **Collection Isolation**: `clearStorage()` must only clear this collection
   - Use `scanByPrefix([collectionId])` then `deleteMany()`, NOT `kvStore.clear()`

3. **Cross-Tab Sync Not Optimized**: Must pass `msg.key` to `processStorageChanges()`
   - Verify only single item is read, not entire collection

4. **Delete Operations**: Use tuple keys for deletion
   - `createItemKey(collectionId, encodeStorageKey(key))`

5. **Batch Operations**: Use `setMany()` and `deleteMany()` for multiple items
   - Don't loop with individual `set()` calls

6. **IndexedDB Array Key Comparison**: Empty array `[]` is greater than any string/number
   - Used in `scanByPrefix` to create upper bound

7. **KVStore Type Parameter**: Update generic parameter from `StoredItem<T>` not `Record<string, StoredItem<T>>`

**Best Practices:**

- Verify cross-tab sync performance improvement
- Check all 5 collections after changes
- Monitor console for warnings during development
- Use browser DevTools to inspect IndexedDB structure (Application > IndexedDB)
- Test with large collections (100+ items) to verify performance
- Verify collection isolation (clear one, others unaffected)

**Performance Notes:**

- **Tuple Key Storage**: Native IndexedDB feature, no parsing overhead
- **Batch Operations**: Critical for good performance (don't skip these)
- **Cross-Tab Sync**: Major improvement (reads 1 item vs entire collection)
- **Collection Prefix Scan**: Uses IDBKeyRange for efficient prefix matching

**Zero Consumer API Changes:**

- External interface completely unchanged
- No consumer code modifications needed
- All type signatures identical
- Only internal implementation changes

This refactoring is a performance optimization. Users won't notice any difference except faster cross-tab sync.
