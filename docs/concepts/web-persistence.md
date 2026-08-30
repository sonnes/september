---
title: Browser persistence
description: The browser app stores all durable application data in one native IndexedDB database and removes the retired databases after one import.
package: web
---

# Browser persistence

The browser app uses one IndexedDB database named `september`. `apps/web/src/services/repository.ts` owns the schema and all durable writes.

## Stores

| Store | Key | Indexes |
| --- | --- | --- |
| `settings` | `key` | none |
| `spaces` | `id` | `user_id`, `updated_at` |
| `messages` | `id` | `space_id`, `created_at` |
| `notes` | `id` | `space_id`, `updated_at` |
| `saved_phrases` | `id` | `space_id`, `created_at` |
| `analytics_events` | `id` | `timestamp`, `[user_id, timestamp]` |
| `blobs` | `id` | `accessed_at` |
| `blob_chunks` | `[blob_id, index]` | `blob_id` |

React Query keeps the UI cache. It does not own persistence.

The repository uses one transaction for related writes. Space removal also removes its messages, notes, and phrases in the same transaction.

## Replace data from a backup

The Data settings screen can read all portable settings and domain stores in
one transaction. It omits provider keys, audio output, migration state, and the
two speech-file stores.

Import validates the complete backup before it opens a write transaction. The
write clears and replaces only the portable settings and domain stores. An
abort keeps every old value. See [Portable backups](portable-backups.md).

## Bounded speech files

ElevenLabs speech uses a key derived from the text, voice, model, stability, similarity, and speed. An exact match reads the saved file and avoids another provider request. Browser system speech does not create a file.

The `blobs` store holds file size, media type, chunk count, and access times. The `blob_chunks` store holds ordered 1 MiB byte ranges. The repository reconstructs a browser `Blob` only after it verifies every chunk and the total size.

The speech cache has a 100 MiB byte limit. Each read updates the file's access time. Before a write, one transaction removes whole files from the oldest access time until the new file fits. A file larger than the limit is not stored.

Storage denial or quota errors do not stop speech. The app plays the new provider response without caching it. Temporary playback URLs are released when playback stops.

## One-time import

The first start imports rows from the retired web databases. It also imports the old UI settings from local storage.

The migration state has three durable values:

- `copying` permits another idempotent import after an interrupted copy.
- `imported` prevents another import and retries cleanup.
- `clean` skips all legacy work.

The import converts `Date` values to millisecond numbers. It validates the imported identifiers before cleanup starts.

After validation, the app removes eight retired databases. It also removes the old panel, dismissed-idea, audio-output, and space-mode keys.

IndexedDB cannot use one transaction across databases. If cleanup is blocked, the app keeps the `imported` state and retries at the next start.

## Provider keys

OpenRouter and ElevenLabs keys stay in the `settings` store. Browser scripts on this origin can read these keys.

The desktop app has a stronger boundary. It stores provider keys in the macOS Keychain.
