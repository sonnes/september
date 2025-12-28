# IndexedDB Collection v2 Implementation Plan

> **For Claude:** Use executing-plans to implement this plan task-by-task.

**Date:** 2025-12-27
**Goal:** Implement IndexedDB-backed TanStack DB collection (v2) with version key tracking and BroadcastChannel sync
**Architecture:** Port TanStack's local-storage.ts pattern to IndexedDB, replacing localStorage with KVStore and storage events with BroadcastChannel
**Tech Stack:** TypeScript, IndexedDB (via KVStore), BroadcastChannel, TanStack DB

**Success Criteria:**

- [ ] All TypeScript interfaces match TanStack DB patterns
- [ ] Version key change detection implemented
- [ ] BroadcastChannel cross-tab sync working
- [ ] SSR-safe (no-op when indexedDB unavailable)
- [ ] All async operations handled correctly
- [ ] Linter passes
- [ ] Error handling uses TanStack error classes

---

## Architecture Overview

### System Structure

The v2 implementation follows TanStack's local-storage.ts pattern with these adaptations:

**Module Boundaries:**

- `collection-v2.ts` - Main collection factory function
- `kv-store.ts` - Existing IndexedDB abstraction (async)
- BroadcastChannel - Cross-tab messaging (built-in)

**Key Differences from v1:**

- v1: Stores raw data directly
- v2: Wraps data in `StoredItem<T>` with `versionKey` (UUID) for change detection
- v1: Uses direct BroadcastChannel messages with full data
- v2: Uses version keys for efficient change detection (only sync when versionKey changes)

**Note:** v2 is a clean implementation - no v1 data format compatibility required.

### Data Flow

**Write Path (insert/update/delete):**

1. Validate mutation is JSON serializable
2. Call user's onInsert/onUpdate/onDelete handler (if provided)
3. Update `lastKnownData` in-memory Map with new versionKey
4. Save entire `lastKnownData` to IndexedDB (async)
5. Send BroadcastChannel message with key and versionKey only
6. Call confirmOperationsSync to move mutations from optimistic to synced

**Read Path (initial sync):**

1. Load all entries from IndexedDB
2. Parse each entry (v2 format: StoredItem wrapper)
3. Populate collection via sync write operations
4. Store in `lastKnownData` for change detection

**Cross-Tab Sync:**

1. Tab A makes change, broadcasts {type: 'change', key, versionKey}
2. Tab B receives message
3. Tab B reads full data from IndexedDB for changed key
4. Tab B compares old vs new versionKey in `lastKnownData`
5. If different, Tab B applies change via sync interface

### Key Design Decisions

1. **Version Key Strategy**: Use crypto.randomUUID() instead of incrementing numbers
   - Rationale: No coordination needed across tabs, guaranteed uniqueness

2. **Async Throughout**: All KVStore operations return Promises
   - Rationale: IndexedDB is inherently async, must handle properly

3. **In-Memory Cache (`lastKnownData`)**: Map tracking current state
   - Rationale: Fast change detection without re-reading IndexedDB, same pattern as local-storage.ts

4. **Storage Format**: Single IndexedDB key contains entire collection
   - Storage Key: Configured via `kvStoreOptions` (dbName + storeName)
   - Value: `{ [encodedKey]: StoredItem<T> }` object
   - Rationale: Atomic updates, consistent with localStorage pattern

5. **BroadcastChannel Messages**: Minimal payload (just key + versionKey)
   - Rationale: Efficient, receiving tab loads full data from IndexedDB if needed

### Integration Points

**TanStack DB Collection Interface:**

- Implements `CollectionConfig<T, TKey, TSchema, Utils>`
- Sync interface: `sync(params)` with `begin/write/commit/markReady`
- Mutation handlers: `onInsert/onUpdate/onDelete`
- Utils: `clearStorage/getStorageSize/acceptMutations`

**KVStore Integration:**

```typescript
KVStore<StoredItem<T>> methods:
  - get(storageKey): Promise<Record<string, StoredItem<T>> | undefined>
  - set(storageKey, data): Promise<void>
  - delete(storageKey): Promise<void>
```

**BroadcastChannel Protocol:**

```typescript
Message Format:
  { type: 'change', key: TKey, versionKey: string } - Item changed
  { type: 'clear' } - Collection cleared
```

### Error Handling Strategy

**Use TanStack Error Classes:**

- `SerializationError` - When JSON.stringify fails on mutation
- `InvalidStorageDataFormatError` - Invalid StoredItem structure in storage
- `InvalidStorageObjectFormatError` - Storage data is not an object
- `StorageKeyRequiredError` - (Not applicable, KVStore config handles this)

**Error Propagation:**

- Sync errors (initial load): Log warning, return empty Map, mark collection ready
- Mutation errors: Throw synchronously (caught by TanStack mutation system)
- Cross-tab sync errors: Log warning, continue (don't crash app)

**IndexedDB Unavailable (SSR):**

- Detect: `typeof indexedDB === 'undefined'`
- Fallback: Create null kvStore, null channel
- Behavior: All operations become no-ops, collection still functional (empty)

### Testing Strategy

**Unit Tests:**

- Interface definitions (TypeScript compilation)
- Key encoding/decoding functions
- Version key generation and change detection
- Error handling for invalid data formats

**Integration Tests:**

- Full mutation flow (insert/update/delete)
- Cross-tab sync via BroadcastChannel
- Initial load from IndexedDB
- SSR no-op behavior
- acceptMutations for manual transactions

**Manual Tests:**

- Open two tabs, verify changes sync
- Refresh page, verify data persists

---

## Interface Definitions

### Module: IndexedDB Collection v2

**File:** `lib/indexeddb/collection-v2.ts`

**Domain Types:**

```typescript
/**
 * Internal storage format with version tracking
 * Matches local-storage.ts pattern
 */
interface StoredItem<T> {
  versionKey: string; // UUID from crypto.randomUUID()
  data: T; // Actual item data
}

/**
 * Parser interface for serialization
 * Same as local-storage.ts
 */
interface Parser {
  parse: (data: string) => unknown;
  stringify: (data: unknown) => string;
}

/**
 * BroadcastChannel message types for cross-tab sync
 */
type IndexedDBSyncMessage<TKey extends string | number> =
  | { type: 'change'; key: TKey; versionKey: string }
  | { type: 'clear' };
```

**Configuration Interface:**

```typescript
/**
 * Configuration for IndexedDB collection v2
 * Extends BaseCollectionConfig from TanStack DB
 */
export interface IndexedDBCollectionConfigV2<
  T extends object,
  TSchema extends StandardSchemaV1 = never,
  TKey extends string | number = string | number,
> extends BaseCollectionConfig<T, TKey, TSchema> {
  /**
   * Options for the underlying IndexedDB KVStore
   * Required: dbName, optional: storeName, version
   */
  kvStoreOptions: KVStoreOptions;

  /**
   * Name of the BroadcastChannel for multi-tab sync
   * If not provided, cross-tab sync disabled
   */
  channelName?: string;

  /**
   * Parser for serialization (defaults to JSON)
   * Allows custom serialization (e.g., superjson)
   */
  parser?: Parser;
}
```

**Utility Functions Interface:**

```typescript
/**
 * Utility functions exposed by collection
 */
export interface IndexedDBCollectionUtilsV2 extends UtilsRecord {
  /**
   * Remove all data from IndexedDB for this collection
   * Async operation
   */
  clearStorage: () => Promise<void>;

  /**
   * Get approximate storage size in bytes
   * Async operation (must read from IndexedDB)
   */
  getStorageSize: () => Promise<number>;

  /**
   * Accept mutations from manual transactions
   * For use in transaction mutationFn
   */
  acceptMutations: (transaction: {
    mutations: Array<PendingMutation<Record<string, unknown>>>;
  }) => Promise<void>;
}
```

**Return Type:**

```typescript
/**
 * Return type of indexedDBCollectionOptionsV2
 */
type IndexedDBCollectionOptionsV2Result<T, TKey, TSchema, TUtils> = CollectionConfig<
  T,
  TKey,
  TSchema,
  TUtils
> & {
  id: string;
  utils: TUtils;
  schema?: TSchema;
};
```

---

## API Specifications

### Function: indexedDBCollectionOptionsV2

**Signature:**

```typescript
// Overload 1: With schema (type inference from schema)
export function indexedDBCollectionOptionsV2<
  T extends StandardSchemaV1,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<InferSchemaOutput<T>, T, TKey> & {
    schema: T;
  }
): CollectionConfig<InferSchemaOutput<T>, TKey, T, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema: T;
};

// Overload 2: Without schema (explicit type T)
export function indexedDBCollectionOptionsV2<
  T extends object,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<T, never, TKey> & {
    schema?: never;
  }
): CollectionConfig<T, TKey, never, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema?: never;
};
```

**Parameters:**

- `config` - Configuration object with:
  - `kvStoreOptions` - Required: dbName, optional: storeName/version
  - `channelName` - Optional: BroadcastChannel name for sync
  - `parser` - Optional: Custom parser (defaults to JSON)
  - `getKey` - Required: Function to extract key from item
  - `id` - Optional: Collection ID (defaults to `indexeddb-collection:${dbName}`)
  - `schema` - Optional: Standard Schema v1 for validation
  - `onInsert/onUpdate/onDelete` - Optional: Mutation handlers

**Returns:**

- Collection configuration object with:
  - All BaseCollectionConfig properties
  - `sync` - Sync configuration for TanStack DB
  - `onInsert/onUpdate/onDelete` - Wrapped mutation handlers
  - `utils` - Utility functions object
  - `id` - Collection identifier
  - `schema` - (if provided) Schema object

**Example Usage:**

```typescript
// Basic usage
const collection = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'my-app' },
    channelName: 'my-app-sync',
    getKey: (item) => item.id,
  })
)

// With custom parser
const collection = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'my-app', storeName: 'todos' },
    channelName: 'todos-sync',
    parser: superjson,
    getKey: (item) => item.id,
  })
)

// With manual transactions
const tx = createTransaction({
  mutationFn: async ({ transaction }) => {
    await api.save(...)
    await collection.utils.acceptMutations(transaction)
  }
})
```

---

## Task Breakdown

### Task 1: Define Core Interfaces and Types

**Objective:** Create TypeScript interfaces matching TanStack DB patterns

**Files:**

- Create: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  BaseCollectionConfig,
  CollectionConfig,
  DeleteMutationFnParams,
  InferSchemaOutput,
  InsertMutationFnParams,
  PendingMutation,
  SyncConfig,
  UpdateMutationFnParams,
  UtilsRecord,
} from '@tanstack/db';
import {
  InvalidStorageDataFormatError,
  InvalidStorageObjectFormatError,
  SerializationError,
} from '@tanstack/db';

import { KVStore, KVStoreOptions } from './kv-store';

// Define all interfaces from Interface Definitions section
// - StoredItem<T>
// - Parser
// - IndexedDBSyncMessage<TKey>
// - IndexedDBCollectionConfigV2<T, TSchema, TKey>
// - IndexedDBCollectionUtilsV2
```

**Validation:**

- File compiles with no TypeScript errors
- All imports resolve correctly
- Interfaces are exported properly

---

### Task 2: Implement Storage Key Encoding

**Objective:** Encode/decode keys to prevent type collisions

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Encodes a key (string or number) into storage-safe format
 * Prevents collisions between numeric and string keys
 *
 * Examples:
 *   - number 1 → "n:1"
 *   - string "1" → "s:1"
 *   - string "n:1" → "s:n:1"
 */
function encodeStorageKey(key: string | number): string {
  if (typeof key === 'number') {
    return `n:${key}`;
  }
  return `s:${key}`;
}

/**
 * Decodes a storage key back to original form
 * Inverse of encodeStorageKey
 */
function decodeStorageKey(encodedKey: string): string | number {
  if (encodedKey.startsWith('n:')) {
    return Number(encodedKey.slice(2));
  }
  if (encodedKey.startsWith('s:')) {
    return encodedKey.slice(2);
  }
  // Fallback for legacy data without encoding
  return encodedKey;
}
```

**Test Cases:**

```typescript
// Number keys
encodeStorageKey(1) === 'n:1';
encodeStorageKey(42) === 'n:42';
decodeStorageKey('n:1') === 1;

// String keys
encodeStorageKey('hello') === 's:hello';
encodeStorageKey('1') === 's:1';
decodeStorageKey('s:hello') === 'hello';

// Edge cases
encodeStorageKey('n:1') === 's:n:1';
decodeStorageKey('legacy-key') === 'legacy-key';
```

**Validation:**

- All test cases pass
- TypeScript types are correct
- No runtime errors

---

### Task 3: Implement UUID Generation and Validation

**Objective:** Version key generation and JSON serialization validation

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Generate a UUID for version tracking
 * Uses crypto.randomUUID() for guaranteed uniqueness
 */
function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Validates that a value can be JSON serialized
 * Throws SerializationError if validation fails
 */
function validateJsonSerializable(parser: Parser, value: any, operation: string): void {
  try {
    parser.stringify(value);
  } catch (error) {
    throw new SerializationError(operation, error instanceof Error ? error.message : String(error));
  }
}
```

**Error Scenarios:**

```typescript
// Valid
validateJsonSerializable(JSON, { id: 1, name: 'test' }, 'insert');
// No error

// Invalid - circular reference
const circular: any = { id: 1 };
circular.self = circular;
validateJsonSerializable(JSON, circular, 'insert');
// Throws: SerializationError('insert', 'Converting circular structure to JSON')

// Invalid - BigInt
validateJsonSerializable(JSON, { id: 1n }, 'update');
// Throws: SerializationError('update', 'Do not know how to serialize a BigInt')
```

**Validation:**

- Compiles with no errors
- Throws correct error types
- Error messages are descriptive

---

### Task 4: Implement Storage Load

**Objective:** Load data from IndexedDB

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Load data from IndexedDB and return as Map
 * Expects v2 format: { [encodedKey]: StoredItem<T> }
 */
async function loadFromStorage<T extends object>(
  kvStore: KVStore<any> | null,
  parser: Parser
): Promise<Map<string | number, StoredItem<T>>> {
  // SSR fallback
  if (!kvStore) {
    return new Map();
  }

  try {
    // IndexedDB stores entire collection as single key-value
    // Key determined by KVStore config, value is our data object
    const entries = await kvStore.entries();
    const dataMap = new Map<string | number, StoredItem<T>>();

    // Process all entries (should be just one for the collection)
    for (const [_, rawData] of entries) {
      if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        console.warn('[IndexedDBCollectionV2] Invalid data format in storage');
        continue;
      }

      // Parse each key-value pair (v2 format)
      Object.entries(rawData).forEach(([encodedKey, value]) => {
        if (value && typeof value === 'object' && 'versionKey' in value && 'data' in value) {
          const storedItem = value as StoredItem<T>;
          const decodedKey = decodeStorageKey(encodedKey);
          dataMap.set(decodedKey, storedItem);
        } else {
          console.warn('[IndexedDBCollectionV2] Invalid StoredItem format for key:', encodedKey);
        }
      });
    }

    return dataMap;
  } catch (error) {
    console.warn('[IndexedDBCollectionV2] Error loading data:', error);
    return new Map();
  }
}
```

**Algorithm:**

1. Check if kvStore is null (SSR) → return empty Map
2. Call `await kvStore.entries()` to get all stored data
3. For each entry (typically one per collection):
   - Validate entry is an object
   - Iterate Object.entries of the data
   - For each [encodedKey, value]:
     - Validate value has `versionKey` and `data` fields (v2 format)
     - Decode key and add to Map
     - Log warning for invalid format
4. Return Map of StoredItem entries

**Test Scenarios:**

```typescript
// v2 format
Storage contains: {
  "s:1": { versionKey: "uuid-1", data: { id: 1, name: "Alice" } },
  "s:2": { versionKey: "uuid-2", data: { id: 2, name: "Bob" } }
}
Result: Map([
  [1, { versionKey: "uuid-1", data: { id: 1, name: "Alice" } }],
  [2, { versionKey: "uuid-2", data: { id: 2, name: "Bob" } }]
])

// Empty storage
Storage contains: null or {}
Result: Map([])

// SSR (kvStore is null)
Result: Map([])

// Invalid format (logs warning, skips item)
Storage contains: {
  "s:1": { id: 1, name: "Alice" }  // Missing versionKey/data wrapper
}
Result: Map([])  // Item skipped with warning
```

**Validation:**

- All test scenarios return correct Map
- No errors on empty storage
- SSR case handled (returns empty Map)
- Invalid format logs warning and skips item

---

### Task 5: Implement Storage Save

**Objective:** Save collection data to IndexedDB atomically

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Save data to IndexedDB
 * Converts Map to object format and persists atomically
 */
async function saveToStorage<T extends object>(
  kvStore: KVStore<any> | null,
  dataMap: Map<string | number, StoredItem<T>>,
  parser: Parser
): Promise<void> {
  // SSR fallback
  if (!kvStore) {
    return;
  }

  try {
    // Convert Map to object format for storage
    const objectData: Record<string, StoredItem<T>> = {};
    dataMap.forEach((storedItem, key) => {
      objectData[encodeStorageKey(key)] = storedItem;
    });

    // Save entire collection as single atomic operation
    // Note: KVStore.set is async, must await
    await kvStore.set('collection-data', objectData);
  } catch (error) {
    console.error('[IndexedDBCollectionV2] Error saving data:', error);
    throw error;
  }
}
```

**Algorithm:**

1. Check if kvStore is null (SSR) → return early
2. Create empty object: `objectData`
3. Iterate dataMap entries:
   - Encode each key
   - Store storedItem at encoded key
4. Await `kvStore.set('collection-data', objectData)`
5. On error: Log and re-throw (allows TanStack to handle)

**Critical Points:**

- Must await kvStore.set (async)
- Single atomic write (entire collection)
- Encode all keys before storage
- Re-throw errors (don't swallow)

**Validation:**

- Async operation completes
- Data persists to IndexedDB
- Errors propagate correctly
- SSR no-op works

---

### Task 6: Implement Change Detection Algorithm

**Objective:** Detect insert/update/delete changes using version keys

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Compare two Maps to find differences using version keys
 * Returns array of changes with type, key, and value
 */
function findChanges<T extends object>(
  oldData: Map<string | number, StoredItem<T>>,
  newData: Map<string | number, StoredItem<T>>
): Array<{
  type: 'insert' | 'update' | 'delete';
  key: string | number;
  value?: T;
}> {
  const changes: Array<{
    type: 'insert' | 'update' | 'delete';
    key: string | number;
    value?: T;
  }> = [];

  // Check for deletions and updates
  oldData.forEach((oldStoredItem, key) => {
    const newStoredItem = newData.get(key);
    if (!newStoredItem) {
      // Key exists in old but not new → deletion
      changes.push({ type: 'delete', key, value: oldStoredItem.data });
    } else if (oldStoredItem.versionKey !== newStoredItem.versionKey) {
      // Key exists in both but versionKey differs → update
      changes.push({ type: 'update', key, value: newStoredItem.data });
    }
    // If versionKey matches → no change
  });

  // Check for insertions
  newData.forEach((newStoredItem, key) => {
    if (!oldData.has(key)) {
      // Key exists in new but not old → insertion
      changes.push({ type: 'insert', key, value: newStoredItem.data });
    }
  });

  return changes;
}
```

**Algorithm:**

1. Initialize empty changes array
2. Iterate oldData Map:
   - For each [key, oldStoredItem]:
     - Look up key in newData
     - If not found → deletion (push { type: 'delete', key, value: oldStoredItem.data })
     - If found and versionKey differs → update (push { type: 'update', key, value: newStoredItem.data })
     - If found and versionKey matches → no change (skip)
3. Iterate newData Map:
   - For each [key, newStoredItem]:
     - If key not in oldData → insertion (push { type: 'insert', key, value: newStoredItem.data })
4. Return changes array

**Test Cases:**

```typescript
// Scenario 1: Insertion
oldData = Map([]);
newData = Map([[1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }]]);
Result: [{ type: 'insert', key: 1, value: { id: 1, name: 'Alice' } }];

// Scenario 2: Update (versionKey changed)
oldData = Map([[1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }]]);
newData = Map([[1, { versionKey: 'uuid-2', data: { id: 1, name: 'Alicia' } }]]);
Result: [{ type: 'update', key: 1, value: { id: 1, name: 'Alicia' } }];

// Scenario 3: Deletion
oldData = Map([[1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }]]);
newData = Map([]);
Result: [{ type: 'delete', key: 1, value: { id: 1, name: 'Alice' } }];

// Scenario 4: No change (same versionKey)
oldData = Map([[1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }]]);
newData = Map([[1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }]]);
Result: [];

// Scenario 5: Multiple changes
oldData = Map([
  [1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }],
  [2, { versionKey: 'uuid-2', data: { id: 2, name: 'Bob' } }],
]);
newData = Map([
  [1, { versionKey: 'uuid-1', data: { id: 1, name: 'Alice' } }], // no change
  [3, { versionKey: 'uuid-3', data: { id: 3, name: 'Charlie' } }], // insert
]);
Result: [
  { type: 'delete', key: 2, value: { id: 2, name: 'Bob' } },
  { type: 'insert', key: 3, value: { id: 3, name: 'Charlie' } },
];
```

**Validation:**

- All test scenarios return correct changes
- Order doesn't matter (set comparison)
- No duplicate changes

---

### Task 7: Implement Sync Configuration

**Objective:** Create sync interface for TanStack DB

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Creates sync configuration for IndexedDB collection
 * Handles initial load, cross-tab sync, and change confirmation
 */
function createIndexedDBSync<T extends object>(
  kvStore: KVStore<any> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>
): SyncConfig<T> & {
  manualTrigger?: () => void;
  collection: any;
  confirmOperationsSync: (mutations: Array<any>) => Promise<void>;
} {
  let syncParams: Parameters<SyncConfig<T>['sync']>[0] | null = null;
  let collection: any = null;

  /**
   * Process storage changes from other tabs
   * Loads new data, finds changes, applies via sync interface
   */
  const processStorageChanges = async () => {
    if (!syncParams) return;

    const { begin, write, commit } = syncParams;

    // Load new data from IndexedDB
    const newData = await loadFromStorage<T>(kvStore, parser);

    // Find changes using version key comparison
    const changes = findChanges(lastKnownData, newData);

    if (changes.length > 0) {
      begin();
      changes.forEach(({ type, value }) => {
        if (value) {
          validateJsonSerializable(parser, value, type);
          write({ type, value });
        }
      });
      commit();

      // Update lastKnownData to new state
      lastKnownData.clear();
      newData.forEach((storedItem, key) => {
        lastKnownData.set(key, storedItem);
      });
    }
  };

  /**
   * Confirms mutations by writing through sync interface
   * Moves mutations from optimistic to synced state
   */
  const confirmOperationsSync = async (mutations: Array<any>) => {
    if (!syncParams) {
      // Sync not initialized yet, mutations will be handled on next sync
      return;
    }

    const { begin, write, commit } = syncParams;

    begin();
    mutations.forEach((mutation: any) => {
      write({
        type: mutation.type,
        value: mutation.type === 'delete' ? mutation.original : mutation.modified,
      });
    });
    commit();
  };

  const syncConfig: SyncConfig<T> & {
    manualTrigger?: () => void;
    collection: any;
    confirmOperationsSync: (mutations: Array<any>) => Promise<void>;
  } = {
    sync: (params: Parameters<SyncConfig<T>['sync']>[0]) => {
      const { begin, write, commit, markReady } = params;

      // Store params and collection for later use
      syncParams = params;
      collection = params.collection;

      // Async initial load
      (async () => {
        try {
          const initialData = await loadFromStorage<T>(kvStore, parser);
          if (initialData.size > 0) {
            begin();
            initialData.forEach(storedItem => {
              validateJsonSerializable(parser, storedItem.data, 'load');
              write({ type: 'insert', value: storedItem.data });
            });
            commit();
          }

          // Update lastKnownData
          lastKnownData.clear();
          initialData.forEach((storedItem, key) => {
            lastKnownData.set(key, storedItem);
          });
        } catch (error) {
          console.error('[IndexedDBCollectionV2] Initial load failed:', error);
        } finally {
          // Always mark ready, even on error
          markReady();
        }
      })();

      // Listen for BroadcastChannel messages
      if (channel) {
        channel.onmessage = async (event: MessageEvent<IndexedDBSyncMessage<string | number>>) => {
          const msg = event.data;
          if (msg.type === 'change') {
            // Another tab changed data, reload and detect changes
            await processStorageChanges();
          } else if (msg.type === 'clear') {
            // Another tab cleared collection
            await processStorageChanges();
          }
        };
      }

      // Cleanup function
      return () => {
        if (channel) {
          channel.close();
        }
      };
    },

    getSyncMetadata: () => ({
      kvStoreOptions: kvStore ? 'configured' : 'ssr-fallback',
      channelName: channel ? 'configured' : 'none',
    }),

    manualTrigger: processStorageChanges,
    collection,
    confirmOperationsSync,
  };

  return syncConfig;
}
```

**Flow:**

1. **Initial Sync** (async):
   - Load data from IndexedDB
   - Write all items via sync interface
   - Update lastKnownData
   - Mark collection ready
2. **BroadcastChannel Listener**:
   - Listen for 'change' and 'clear' messages
   - On message → processStorageChanges()
3. **Process Storage Changes**:
   - Load new data from IndexedDB
   - Compare with lastKnownData using findChanges()
   - Apply changes via sync interface
   - Update lastKnownData
4. **Confirm Operations Sync**:
   - Called after mutations
   - Writes mutations through sync to move from optimistic to synced

**Critical Points:**

- Initial load is async (must use IIFE or Promise)
- Always markReady (even on error)
- BroadcastChannel message handler is async
- Cleanup closes BroadcastChannel

**Validation:**

- Initial load populates collection
- markReady called after load completes
- BroadcastChannel messages trigger re-sync
- Cleanup closes channel

---

### Task 8: Implement Mutation Handlers

**Objective:** Wrap user handlers to persist to IndexedDB

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Create wrapped mutation handlers
 * These persist changes to IndexedDB and broadcast to other tabs
 */
function createMutationHandlers<T extends object, TKey extends string | number>(
  config: IndexedDBCollectionConfigV2<T, any, TKey>,
  kvStore: KVStore<any> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>,
  sync: { confirmOperationsSync: (mutations: Array<any>) => Promise<void> }
) {
  /**
   * Wrapped onInsert handler
   */
  const wrappedOnInsert = async (params: InsertMutationFnParams<T>) => {
    // 1. Validate JSON serializable
    params.transaction.mutations.forEach(mutation => {
      validateJsonSerializable(parser, mutation.modified, 'insert');
    });

    // 2. Call user handler (if provided)
    let handlerResult: any = {};
    if (config.onInsert) {
      handlerResult = (await config.onInsert(params)) ?? {};
    }

    // 3. Update lastKnownData with new versionKeys
    params.transaction.mutations.forEach(mutation => {
      const storedItem: StoredItem<T> = {
        versionKey: generateUuid(),
        data: mutation.modified,
      };
      lastKnownData.set(mutation.key, storedItem);
    });

    // 4. Save to IndexedDB
    await saveToStorage(kvStore, lastKnownData, parser);

    // 5. Broadcast to other tabs
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

    // 6. Confirm mutations (move to synced state)
    await sync.confirmOperationsSync(params.transaction.mutations);

    return handlerResult;
  };

  /**
   * Wrapped onUpdate handler
   */
  const wrappedOnUpdate = async (params: UpdateMutationFnParams<T>) => {
    // Same pattern as onInsert
    params.transaction.mutations.forEach(mutation => {
      validateJsonSerializable(parser, mutation.modified, 'update');
    });

    let handlerResult: any = {};
    if (config.onUpdate) {
      handlerResult = (await config.onUpdate(params)) ?? {};
    }

    params.transaction.mutations.forEach(mutation => {
      const storedItem: StoredItem<T> = {
        versionKey: generateUuid(),
        data: mutation.modified,
      };
      lastKnownData.set(mutation.key, storedItem);
    });

    await saveToStorage(kvStore, lastKnownData, parser);

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

    await sync.confirmOperationsSync(params.transaction.mutations);

    return handlerResult;
  };

  /**
   * Wrapped onDelete handler
   */
  const wrappedOnDelete = async (params: DeleteMutationFnParams<T>) => {
    // No validation needed for delete (no new data)

    let handlerResult: any = {};
    if (config.onDelete) {
      handlerResult = (await config.onDelete(params)) ?? {};
    }

    // Remove from lastKnownData
    params.transaction.mutations.forEach(mutation => {
      lastKnownData.delete(mutation.key);
    });

    await saveToStorage(kvStore, lastKnownData, parser);

    if (channel) {
      params.transaction.mutations.forEach(mutation => {
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: '', // Empty for deletions
        } as IndexedDBSyncMessage<TKey>);
      });
    }

    await sync.confirmOperationsSync(params.transaction.mutations);

    return handlerResult;
  };

  return {
    wrappedOnInsert,
    wrappedOnUpdate,
    wrappedOnDelete,
  };
}
```

**Mutation Flow (for each handler):**

1. Validate JSON serializable (insert/update only)
2. Call user handler (if provided)
3. Update lastKnownData with new versionKey (or delete)
4. Save to IndexedDB (await)
5. Broadcast change to other tabs via BroadcastChannel
6. Confirm mutations via sync interface (move to synced state)
7. Return user handler result

**Critical Points:**

- All operations are async (must await saveToStorage and confirmOperationsSync)
- Generate new UUID for each insert/update
- Broadcast includes key and versionKey (minimal payload)
- Delete broadcasts with empty versionKey
- User handler called BEFORE persistence (same as local-storage.ts)

**Validation:**

- Data persists to IndexedDB after mutations
- BroadcastChannel messages sent
- User handler results returned
- Errors propagate correctly

---

### Task 9: Implement Utility Functions

**Objective:** Provide clearStorage, getStorageSize, acceptMutations

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
/**
 * Create utility functions for collection
 */
function createUtilities<T extends object, TKey extends string | number>(
  kvStore: KVStore<any> | null,
  channel: BroadcastChannel | null,
  parser: Parser,
  lastKnownData: Map<string | number, StoredItem<T>>,
  sync: {
    collection: any;
    confirmOperationsSync: (mutations: Array<any>) => Promise<void>;
  },
  collectionId: string
): IndexedDBCollectionUtilsV2 {
  /**
   * Clear all data from IndexedDB for this collection
   */
  const clearStorage = async (): Promise<void> => {
    if (!kvStore) return;

    try {
      await kvStore.clear();
      lastKnownData.clear();

      // Broadcast clear to other tabs
      if (channel) {
        channel.postMessage({ type: 'clear' } as IndexedDBSyncMessage<TKey>);
      }
    } catch (error) {
      console.error('[IndexedDBCollectionV2] Error clearing storage:', error);
      throw error;
    }
  };

  /**
   * Get approximate storage size in bytes
   * Must read from IndexedDB and calculate size
   */
  const getStorageSize = async (): Promise<number> => {
    if (!kvStore) return 0;

    try {
      const data = await loadFromStorage<T>(kvStore, parser);
      // Convert to string to get approximate size
      const objectData: Record<string, StoredItem<T>> = {};
      data.forEach((storedItem, key) => {
        objectData[encodeStorageKey(key)] = storedItem;
      });
      const serialized = parser.stringify(objectData);
      return new Blob([serialized]).size;
    } catch (error) {
      console.error('[IndexedDBCollectionV2] Error getting storage size:', error);
      return 0;
    }
  };

  /**
   * Accept mutations from manual transactions
   * For use in transaction mutationFn
   */
  const acceptMutations = async (transaction: {
    mutations: Array<PendingMutation<Record<string, unknown>>>;
  }): Promise<void> => {
    // Filter mutations belonging to this collection
    const collectionMutations = transaction.mutations.filter(m => {
      // Try collection reference first
      if (sync.collection && m.collection === sync.collection) {
        return true;
      }
      // Fall back to collection ID
      return m.collection.id === collectionId;
    });

    if (collectionMutations.length === 0) {
      return;
    }

    // Validate all mutations can be serialized
    for (const mutation of collectionMutations) {
      switch (mutation.type) {
        case 'insert':
        case 'update':
          validateJsonSerializable(parser, mutation.modified, mutation.type);
          break;
        case 'delete':
          validateJsonSerializable(parser, mutation.original, mutation.type);
          break;
      }
    }

    // Apply mutations to lastKnownData
    for (const mutation of collectionMutations) {
      switch (mutation.type) {
        case 'insert':
        case 'update': {
          const storedItem: StoredItem<Record<string, unknown>> = {
            versionKey: generateUuid(),
            data: mutation.modified,
          };
          lastKnownData.set(mutation.key, storedItem as any);
          break;
        }
        case 'delete': {
          lastKnownData.delete(mutation.key);
          break;
        }
      }
    }

    // Save to IndexedDB
    await saveToStorage(kvStore, lastKnownData, parser);

    // Broadcast changes
    if (channel) {
      for (const mutation of collectionMutations) {
        const storedItem = lastKnownData.get(mutation.key);
        channel.postMessage({
          type: 'change',
          key: mutation.key,
          versionKey: storedItem?.versionKey ?? '',
        } as IndexedDBSyncMessage<string | number>);
      }
    }

    // Confirm mutations
    await sync.confirmOperationsSync(collectionMutations);
  };

  return {
    clearStorage,
    getStorageSize,
    acceptMutations,
  };
}
```

**clearStorage Algorithm:**

1. Check kvStore null (SSR) → return
2. Await kvStore.clear()
3. Clear lastKnownData Map
4. Broadcast 'clear' message to other tabs
5. On error: Log and re-throw

**getStorageSize Algorithm:**

1. Check kvStore null (SSR) → return 0
2. Load data from IndexedDB
3. Convert Map to object format
4. Stringify using parser
5. Calculate Blob size
6. Return size in bytes
7. On error: Log and return 0

**acceptMutations Algorithm:**

1. Filter mutations belonging to this collection
2. Validate all mutations are JSON serializable
3. Apply mutations to lastKnownData (insert/update/delete)
4. Save to IndexedDB (await)
5. Broadcast changes to other tabs
6. Confirm mutations via sync

**Validation:**

- All functions handle SSR (null kvStore)
- Async operations awaited
- Errors handled appropriately
- BroadcastChannel messages sent

---

### Task 10: Implement Main Factory Function

**Objective:** Create indexedDBCollectionOptionsV2 function with overloads

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
// Overload 1: With schema
export function indexedDBCollectionOptionsV2<
  T extends StandardSchemaV1,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<InferSchemaOutput<T>, T, TKey> & {
    schema: T;
  }
): CollectionConfig<InferSchemaOutput<T>, TKey, T, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema: T;
};

// Overload 2: Without schema
export function indexedDBCollectionOptionsV2<
  T extends object,
  TKey extends string | number = string | number,
>(
  config: IndexedDBCollectionConfigV2<T, never, TKey> & {
    schema?: never;
  }
): CollectionConfig<T, TKey, never, IndexedDBCollectionUtilsV2> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema?: never;
};

// Implementation
export function indexedDBCollectionOptionsV2(
  config: IndexedDBCollectionConfigV2<any, any, string | number>
): Omit<CollectionConfig<any, string | number, any, IndexedDBCollectionUtilsV2>, 'id'> & {
  id: string;
  utils: IndexedDBCollectionUtilsV2;
  schema?: StandardSchemaV1;
} {
  // 1. Setup storage and channel
  const kvStore = typeof indexedDB !== 'undefined' ? new KVStore<any>(config.kvStoreOptions) : null;

  const channel =
    typeof BroadcastChannel !== 'undefined' && config.channelName
      ? new BroadcastChannel(config.channelName)
      : null;

  const parser = config.parser ?? JSON;

  // 2. Create in-memory cache
  const lastKnownData = new Map<string | number, StoredItem<any>>();

  // 3. Create sync configuration
  const sync = createIndexedDBSync(kvStore, channel, parser, lastKnownData);

  // 4. Create mutation handlers
  const { wrappedOnInsert, wrappedOnUpdate, wrappedOnDelete } = createMutationHandlers(
    config,
    kvStore,
    channel,
    parser,
    lastKnownData,
    sync
  );

  // 5. Generate collection ID
  const collectionId = config.id ?? `indexeddb-collection:${config.kvStoreOptions.dbName}`;

  // 6. Create utilities
  const utils = createUtilities(kvStore, channel, parser, lastKnownData, sync, collectionId);

  // 7. Extract standard config properties
  const {
    kvStoreOptions: _kvStoreOptions,
    channelName: _channelName,
    parser: _parser,
    onInsert: _onInsert,
    onUpdate: _onUpdate,
    onDelete: _onDelete,
    id: _id,
    ...restConfig
  } = config;

  // 8. Return collection config
  return {
    ...restConfig,
    id: collectionId,
    sync,
    onInsert: wrappedOnInsert,
    onUpdate: wrappedOnUpdate,
    onDelete: wrappedOnDelete,
    utils,
  };
}
```

**Algorithm:**

1. Setup KVStore (null if SSR)
2. Setup BroadcastChannel (null if unavailable or no channelName)
3. Default parser to JSON
4. Create lastKnownData Map
5. Create sync configuration
6. Create wrapped mutation handlers
7. Generate collection ID (default: `indexeddb-collection:${dbName}`)
8. Create utility functions
9. Extract and omit config properties
10. Return collection config object

**SSR Handling:**

- Check `typeof indexedDB !== 'undefined'` for KVStore
- Check `typeof BroadcastChannel !== 'undefined'` for channel
- If either is null, operations become no-ops

**Validation:**

- TypeScript overloads work correctly
- SSR creates null kvStore and channel
- Collection ID defaults correctly
- All wrapped handlers assigned
- Utils object created

---

### Task 11: Export Public API

**Objective:** Export all public interfaces and functions

**Files:**

- Edit: `lib/indexeddb/collection-v2.ts`

**Implementation:**

```typescript
// At top of file
export type {
  IndexedDBCollectionConfigV2,
  IndexedDBCollectionUtilsV2,
  Parser,
}

// Main function already exported in Task 10
export { indexedDBCollectionOptionsV2 }

// Internal types/functions NOT exported:
// - StoredItem (internal only)
// - IndexedDBSyncMessage (internal only)
// - encodeStorageKey/decodeStorageKey (internal only)
// - generateUuid (internal only)
// - validateJsonSerializable (internal only)
// - loadFromStorage (internal only)
// - saveToStorage (internal only)
// - findChanges (internal only)
// - createIndexedDBSync (internal only)
// - createMutationHandlers (internal only)
// - createUtilities (internal only)
```

**Public API:**

```typescript
// Types
import type {
  IndexedDBCollectionConfigV2,
  IndexedDBCollectionUtilsV2,
  Parser,
} from 'lib/indexeddb/collection-v2';
// Function
import { indexedDBCollectionOptionsV2 } from 'lib/indexeddb/collection-v2';
```

**Validation:**

- All public exports available
- Internal functions not exported
- TypeScript compilation succeeds
- Import statements work

---

## Integration & Validation

**After all tasks:**

1. TypeScript Compilation

```bash
pnpm run build
# Should compile with no errors
```

2. Linter

```bash
pnpm run lint
# Should pass with no warnings
```

3. Manual Testing:

**Test 1: Basic CRUD**

```typescript
const collection = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'test-db' },
    getKey: item => item.id,
  })
);

collection.insert({ id: 1, name: 'Alice' });
// Check: Data appears in IndexedDB
// Check: collection.state.data has item

collection.update({ id: 1, name: 'Alicia' });
// Check: IndexedDB updated
// Check: versionKey changed

collection.delete({ id: 1 });
// Check: Item removed from IndexedDB
// Check: collection.state.data empty
```

**Test 2: Cross-Tab Sync**

```typescript
// Tab 1
const collection1 = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'sync-test' },
    channelName: 'sync-channel',
    getKey: item => item.id,
  })
);
collection1.insert({ id: 1, name: 'Alice' });

// Tab 2 (same config)
const collection2 = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'sync-test' },
    channelName: 'sync-channel',
    getKey: item => item.id,
  })
);

// Check: collection2.state.data has item from Tab 1
// Tab 2: Update item
collection2.update({ id: 1, name: 'Alicia' });
// Check: Tab 1 collection1.state.data updates automatically
```

**Test 3: SSR Safety**

```typescript
// Simulate SSR (mock indexedDB as undefined)
global.indexedDB = undefined;

const collection = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'ssr-test' },
    getKey: item => item.id,
  })
);

collection.insert({ id: 1, name: 'Alice' });
// Check: No errors thrown
// Check: Operations are no-ops (data not persisted)
```

**Test 4: Utility Functions**

```typescript
const collection = createCollection(
  indexedDBCollectionOptionsV2({
    kvStoreOptions: { dbName: 'utils-test' },
    getKey: item => item.id,
  })
);

collection.insert({ id: 1, name: 'Alice' });
collection.insert({ id: 2, name: 'Bob' });

// getStorageSize
const size = await collection.utils.getStorageSize();
// Check: size > 0

// clearStorage
await collection.utils.clearStorage();
// Check: IndexedDB empty
// Check: collection.state.data empty

// acceptMutations (manual transaction)
const tx = createTransaction({
  mutationFn: async ({ transaction }) => {
    await collection.utils.acceptMutations(transaction);
  },
});
tx.mutate(() => {
  collection.insert({ id: 3, name: 'Charlie' });
});
await tx.commit();
// Check: Data persisted to IndexedDB
```

**Performance Checks:**

- Initial load time < 100ms for 100 items
- Cross-tab sync latency < 50ms
- Storage size reasonable (not bloated with metadata)

**Security Checks:**

- No sensitive data in BroadcastChannel messages (only keys and versionKeys)
- Serialization errors caught and reported
- No XSS vulnerabilities in stored data

---

## Rollback

If implementation fails:

```bash
git checkout lib/indexeddb/collection-v2.ts
```

If IndexedDB corrupted during testing:

```javascript
// In browser console
indexedDB.deleteDatabase('test-db');
```

---

## References

- Research: User-provided research findings
- TanStack DB: `/node_modules/@tanstack/db/src/local-storage.ts`
- Existing v1: `lib/indexeddb/collection.ts`
- KVStore: `lib/indexeddb/kv-store.ts`

---

## Notes for Implementer

**DRY:**

- Reuse TanStack patterns (don't reinvent)
- Extract common logic into helper functions
- Use same error classes as TanStack

**YAGNI:**

- Don't add features beyond the spec
- Don't optimize prematurely (IndexedDB is already async)
- Don't add complex caching beyond lastKnownData

**Pitfalls:**

1. **Forgetting await**: All KVStore operations are async
2. **SSR crashes**: Always check `typeof indexedDB !== 'undefined'`
3. **Race conditions**: BroadcastChannel messages can arrive while mutation in progress
4. **Version key collisions**: Use crypto.randomUUID(), not Date.now()
5. **Storage format mismatch**: Always encode/decode keys consistently
6. **Circular references**: validateJsonSerializable will catch, but test edge cases
7. **Memory leaks**: Clean up BroadcastChannel on collection dispose

**Best Practices:**

- Follow TanStack DB patterns exactly (proven architecture)
- Make all async operations explicit with await
- Log errors but don't swallow them (re-throw)
- Test SSR mode thoroughly (easy to miss)
- Verify cross-tab sync with real browser tabs (not just tests)
