# Triplit Directory

This directory contains Triplit configuration and schema for September's local-first database.

## Purpose

Triplit provides local-only data storage for:

- **Unauthenticated Users** - Try the app without login
- **Offline Support** - Work without internet connection
- **Privacy** - Data never leaves the device
- **Fast Access** - No network latency

**Important**: Triplit in September is **local-only** with **no sync capabilities**. Data is not synchronized to cloud or across devices.

## Key Files

### Client Configuration

**[client.ts](client.ts)** - Triplit client initialization

**Key Features**:

- Browser storage: Uses IndexedDB for persistence
- Server storage: Uses in-memory storage (no persistence)
- Auto-connect disabled (local-only mode)
- Schema validation enabled

**Usage**:

```typescript
import { triplit } from '@/triplit/client';

// Insert data
await triplit.insert('messages', {
  text: 'Hello',
  type: 'user',
  user_id: 'local-user',
});

// Query data
const messages = await triplit.fetch(triplit.query('messages').order('created_at', 'DESC'));
```

### Schema Definition

**[schema.ts](schema.ts)** - Database schema for all collections

Defines four collections:

1. **accounts** - User account and settings (mirrors Supabase)
2. **messages** - User messages with optional audio
3. **documents** - Markdown documents for editor
4. **audio_files** - Audio recordings stored as base64 blobs

## Collections

### accounts

User profile and configuration storage.

**Fields**:

- Personal: `name`, `city`, `country`
- Medical: `primary_diagnosis`, `year_of_diagnosis`, `medical_document_path`
- AI Config: `ai_suggestions`, `ai_transcription`, `ai_speech`, `ai_providers`
- Flags: `terms_accepted`, `privacy_policy_accepted`, `onboarding_completed`
- Timestamps: `created_at`, `updated_at`

**Usage**:

```typescript
await triplit.insert('accounts', {
  name: 'John Doe',
  city: 'Seattle',
  ai_suggestions: { enabled: true, max_suggestions: 5 },
});
```

### messages

Conversation messages with optional audio attachments.

**Fields**:

- `id` - UUID v4
- `text` - Message content
- `type` - Message type (user/ai/system)
- `user_id` - Owner ID
- `audio_path` - Optional audio reference
- `created_at` - Timestamp

**Usage**:

```typescript
await triplit.insert('messages', {
  text: 'Hello world',
  type: 'user',
  user_id: 'local-user',
});
```

### documents

Markdown documents for the editor.

**Fields**:

- `id` - UUID v4
- `name` - Document title
- `content` - Markdown content
- `created_at`, `updated_at` - Timestamps

**Usage**:

```typescript
await triplit.insert('documents', {
  name: 'My Document',
  content: '# Hello\n\nThis is my document.',
});
```

### audio_files

Audio recordings stored as base64 blobs.

**Fields**:

- `id` - Unique identifier
- `blob` - Base64-encoded audio data
- `alignment` - Optional word alignment data (JSON)
- `created_at` - Timestamp

**Usage**:

```typescript
await triplit.insert('audio_files', {
  id: 'audio-123',
  blob: 'data:audio/webm;base64,...',
  alignment: { words: [...], timestamps: [...] }
});
```

## Storage

### Browser Storage

Uses **IndexedDB** for persistent local storage:

- Data survives page refreshes
- Shared across tabs from same origin
- Can store large amounts of data
- Cleared when user clears browser data

### Server Storage

Uses **in-memory** storage on server:

- No persistence (data lost on restart)
- Used for server-side rendering
- Prevents server memory leaks

## Data Flow

### Unauthenticated Users

```
Component
  ↓
Hook (use-triplit.tsx)
  ↓
Triplit Client
  ↓
IndexedDB (Browser)
```

### Authenticated Users

```
Component
  ↓
Hook (use-supabase.tsx)
  ↓
Service Class
  ↓
Supabase API
  ↓
PostgreSQL (Cloud)
```

## Service Integration

Each domain service has both Supabase and Triplit hooks:

**Messages**:

- [../services/messages/use-supabase.tsx](../services/messages/use-supabase.tsx) - Cloud storage
- [../services/messages/use-triplit.tsx](../services/messages/use-triplit.tsx) - Local storage

**Account**:

- [../packages/account) - Cloud storage
- [../packages/account) - Local storage

**Audio**:

- [../services/audio/use-supabase.tsx](../services/audio/use-supabase.tsx) - Cloud storage (files)
- [../services/audio/use-triplit.tsx](../services/audio/use-triplit.tsx) - Local storage (blobs)

## Querying Data

### Basic Query

```typescript
const query = triplit
  .query('messages')
  .where('type', '=', 'user')
  .order('created_at', 'DESC')
  .limit(10);

const results = await triplit.fetch(query);
```

### Reactive Queries

```typescript
const unsubscribe = triplit.subscribe(triplit.query('messages'), results => {
  console.log('Messages updated:', results);
});

// Cleanup
unsubscribe();
```

### CRUD Operations

```typescript
// Create
await triplit.insert('messages', { text: 'Hello', type: 'user' });

// Read
const message = await triplit.fetchById('messages', 'message-id');

// Update
await triplit.update('messages', 'message-id', { text: 'Updated' });

// Delete
await triplit.delete('messages', 'message-id');
```

## Limitations

### No Sync

Triplit in September is configured **without sync**:

- Data stays on device only
- No cloud backup
- No multi-device sync
- No collaboration features

To enable sync, you would need:

1. Triplit Cloud account
2. Update client config with sync token
3. Enable `autoConnect: true`

### No Search

Triplit doesn't support full-text search:

- Use Supabase for search features
- Client-side filtering for local data
- Consider search-only sync for authenticated users

### Storage Limits

IndexedDB has browser-dependent limits:

- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB per origin

Monitor storage usage for large datasets.

## Schema Changes

When updating schema:

1. Update [schema.ts](schema.ts)
2. Update corresponding TypeScript types in [../types/](../types/)
3. Update service hooks that use the collection
4. Consider migration strategy for existing local data

**Note**: Triplit doesn't have built-in migrations. Schema changes may require clearing local data.

## Best Practices

### Data Retention

For unauthenticated users:

- Keep data size manageable
- Implement data cleanup policies
- Warn users about data loss on browser clear

### Type Safety

Use TypeScript for type-safe queries:

```typescript
import type { TriplitClient } from '@/triplit/client';

type Message = {
  id: string;
  text: string;
  type: string;
};
```

### Error Handling

Always handle errors in Triplit operations:

```typescript
try {
  await triplit.insert('messages', data);
} catch (error) {
  console.error('Failed to save message:', error);
  // Handle error gracefully
}
```

## Related Documentation

- [Supabase Directory](../supabase/README.md) - Cloud database alternative
- [Services Directory](../services/README.md) - Services that use Triplit
- [Types Directory](../types/README.md) - Shared type definitions
