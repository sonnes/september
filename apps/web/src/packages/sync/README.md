# @september/sync

Client sync engine: mirrors local records to the Cloudflare backend
(`apps/server`) and authenticates with Google. The local browser or desktop
database stays the source of truth, so the app keeps working offline.

## Feature flag

Sync is **off unless both env vars are set**, so the app is unchanged without them:

```
VITE_SYNC_API_URL=https://your-worker.example.com   # the apps/server Worker origin
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

With these set, a "Cloud sync" section appears in Settings with a Google sign-in
button. Until a user signs in, everything stays local (guest mode).

## How it works

Browser mutations flow from TanStack DB collection callbacks into the
in-memory outbox. Pulled changes use `collection.utils.acceptMutations`, which
bypasses those callbacks and prevents an echo loop.

Desktop record writes atomically add rows to the Rust-owned durable outbox.
The engine calls `sync_outbox_list`, pushes the returned mutations, and then
calls `sync_outbox_ack`. It flushes any pending durable entries on startup.
Pulled changes go through `sync_apply_remote`, which updates SQLite and the
`cloud_cursor` metadata atomically without creating new outbox entries.

- **Outbox** ([lib/outbox.ts](lib/outbox.ts)) buffers local mutations (collapsing
  repeated edits of one record) for batched browser pushes. Rust owns the
  durable desktop outbox.
- **Capturing local changes** ([runtime.ts](runtime.ts)) — collections call
  `captureLocal` from their `on*` hooks. Server changes arrive via `acceptMutations`,
  a different path, so there is **no echo loop**.
- **Engine** ([lib/engine.ts](lib/engine.ts)) pushes the outbox and pulls remote
  changes since a persisted cursor, reviving JSON through each collection's Zod
  schema (ISO strings → `Date`). The browser persists its cursor in
  `localStorage`; desktop reads `cloud_cursor` through `sync_metadata_get`.
  Conflicts are last-write-wins by `updated_at`.
- **Auth** ([lib/auth.ts](lib/auth.ts), [sync-context.tsx](sync-context.tsx)) — the
  Google ID token is exchanged at `/api/auth/google` for a stateless session token,
  stored in `localStorage` for the browser. Desktop stores the session and display
  profile through the Rust settings RPC. `useCurrentUser()` returns the authenticated
  user when signed in, or the local guest when signed out.

## Synced collections

`user-account`, `spaces`, `messages`, `saved-phrases`, `documents` (notes). Analytics
stays local. Registry: [registry.ts](registry.ts).

## Public API

- `<SyncProvider>` — mount inside `ClientProviders` (already wired). Inert when disabled.
- `useSyncAuth()` — `{ user, signInWithCredential, signOut } | null`.
- `<GoogleSyncControl />` — sign-in button / signed-in status for the account UI.
- `createSyncClient(...)` — the HTTP client (login/push/pull/blobs).

## Tested

`pnpm test src/packages/sync` — api-client, auth, cursor, outbox, and engine (27 tests).
The React/GIS glue is env-gated and validated by build + lint.

## Blob sync (R2)

Audio (and reel) blobs mirror to R2 under the user's `audio/` prefix. The
[blob-bridge.ts](blob-bridge.ts) leaf holds the active blob client (set by
`SyncProvider` on sign-in, cleared on sign-out); `@/packages/audio` storage calls it:

- writes (`uploadAudioBinary`/`uploadAudio`) mirror to R2 fire-and-forget,
- a local read-miss (`downloadAudio`/`getAudio`) falls back to R2 and caches the bytes
  locally, so a second device fills its browser or desktop file store on demand,
- `deleteAudio` removes the R2 object too.

When signed out the bridge is inert, so behaviour is unchanged.

## Known follow-ups

- **Guest → account migration**: signing in switches identity to the Google `userId`;
  existing `local-user` rows are not migrated into the account.
