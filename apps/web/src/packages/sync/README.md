# @september/sync

Client sync engine: mirrors the local IndexedDB collections to the Cloudflare
backend (`apps/server`) and authenticates with Google. **Local-first** — IndexedDB
stays the source of truth; the backend is a sync/backup target, so the app keeps
working fully offline.

## Feature flag

Sync is **off unless both env vars are set**, so the app is unchanged without them:

```
VITE_SYNC_API_URL=https://your-worker.example.com   # the apps/server Worker origin
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

With these set, a "Cloud sync" section appears in Settings with a Google sign-in
button. Until a user signs in, everything stays local (guest mode).

## How it works

```
local mutation ─▶ collection onInsert/onUpdate/onDelete ─▶ captureLocal ─▶ outbox
                                                                              │ (debounced)
                                                                  engine.flush ▼ POST /api/sync/push
server change  ◀─ engine.pullOnce (interval/online) GET /api/sync/pull ─▶ collection.utils.acceptMutations
```

- **Outbox** ([lib/outbox.ts](lib/outbox.ts)) buffers local mutations (collapsing
  repeated edits of one record) for batched push.
- **Capturing local changes** ([runtime.ts](runtime.ts)) — collections call
  `captureLocal` from their `on*` hooks. Server changes arrive via `acceptMutations`,
  a different path, so there is **no echo loop**.
- **Engine** ([lib/engine.ts](lib/engine.ts)) pushes the outbox and pulls remote
  changes since a persisted cursor, reviving JSON through each collection's Zod
  schema (ISO strings → `Date`) before `acceptMutations`. Conflicts are last-write-wins
  by `updated_at`.
- **Auth** ([lib/auth.ts](lib/auth.ts), [sync-context.tsx](sync-context.tsx)) — the
  Google ID token is exchanged at `/api/auth/google` for a stateless session token,
  stored in `localStorage`; `useCurrentUser()` returns the authenticated user when
  signed in, else the local guest.

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

## Known follow-ups

- **Guest → account migration**: signing in switches identity to the Google `userId`;
  existing `local-user` rows are not yet migrated into the account.
- **Blob sync**: `putBlob`/`getBlob` exist on the client; audio/reel mirroring to R2 is
  not yet wired into the audio storage layer.
