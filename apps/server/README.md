# @september/server

Cloudflare Worker backend for September: per-user durable storage, multi-device
sync, and blob storage. A single Worker hosts everything and serves the SPA, so
the app and its API share one origin (no CORS).

## Architecture

```
Browser SPA (IndexedDB, primary) ──HTTPS──▶ Cloudflare Worker (src/index.ts)
                                              ├─ /api/auth/google → UserManagerDO (one common, singleton)
                                              ├─ /api/sync/*      → UserDataDO(userId)  (one SQLite per user)
                                              ├─ /api/blobs/*     → R2  users/{userId}/…
                                              └─ else             → ASSETS (the built SPA)
```

- **`UserManagerDO`** ([src/user-manager-do.ts](src/user-manager-do.ts)) — the one
  common Durable Object, addressed as a singleton (`idFromName("global")`). Holds the
  user registry (`google_sub → userId`) and a token revocation list. It mints stateless
  session tokens but is **not on the per-request hot path**: it is only touched at login.
- **`UserDataDO`** ([src/user-data-do.ts](src/user-data-do.ts)) — one instance per user
  (`idFromName(userId)`), each with its own private SQLite. All synced collections live
  in a single generic `records` table keyed by `(collection, id)`, with an `updated_at`
  last-write-wins clock and a monotonic `seq` that drives the pull cursor. Deletes are
  tombstones so other devices learn of them.
- **R2** — one bucket (`september-user-blobs`), per-user key prefix `users/{userId}/…`
  for audio and reel exports.

## Auth (Google login)

1. The browser runs Google Identity Services and gets a Google **ID token**.
2. `POST /api/auth/google { idToken }` → the Worker verifies it against Google's JWKS
   (signature, `aud == GOOGLE_CLIENT_ID`, issuer, expiry, `email_verified`) in
   [src/auth.ts](src/auth.ts), upserts the user, and returns
   `{ token, userId }`.
3. The client sends `Authorization: Bearer <token>` on every API call. The Worker
   verifies the **HMAC-signed** token at the edge (no DO round-trip) to resolve `userId`.

No email sending is required — Google is the identity provider.

### Protecting the common DO

- Durable Objects have no public endpoint; the Worker is the only ingress.
- Stateless tokens keep the singleton off the request hot path (only login hits it).
- Harden the one public endpoint (`/api/auth/google`): strict ID-token verification,
  per-IP rate limiting (Cloudflare WAF/Rate Limiting), optional Turnstile.
- `SESSION_SIGNING_KEY` is a Worker secret; `GOOGLE_CLIENT_ID` is public by design.

## Sync protocol

- `POST /api/sync/push` — `{ mutations: Mutation[] }`. Each mutation is
  `{ collection, id, op: 'upsert'|'delete', data?, version?, updatedAt }`. Returns
  `{ cursor, applied }`. LWW: a write is ignored if a stored row has a newer `updatedAt`.
- `GET /api/sync/pull?since=<cursor>` — returns `{ changes, cursor }` with every change
  whose `seq > since`, oldest first.

The client keeps IndexedDB as the primary store and syncs in the background (push from an
outbox, pull from the last cursor), reusing the existing `versionKey` conflict machinery.

## Blobs

- `PUT /api/blobs/<key>` — store bytes at `users/{userId}/<key>`.
- `GET /api/blobs/<key>` — fetch (404 if absent / another user's).
- `DELETE /api/blobs/<key>` — remove.

## Develop

```sh
pnpm install            # install deps (first run also builds workerd: pnpm rebuild workerd esbuild)
pnpm test               # vitest under the Workers runtime (Miniflare)
pnpm typecheck          # tsc --noEmit
pnpm dev                # wrangler dev (local DO + R2 simulation, serves ./public)
```

## Deploy (replaces the Vercel SPA — single origin)

This Worker serves the built SPA **and** the API from one origin, so the move off
Vercel is: build the web app, then `wrangler deploy`. Cross-origin isolation
(COOP/COEP/CORP, needed for WebLLM/ffmpeg `SharedArrayBuffer`) ships via
`apps/web/public/_headers`, carried into the deployed assets — parity with the old
`vercel.json`.

**One-time setup** (Workers **Paid** plan required for production DO storage):

```sh
wrangler r2 bucket create september-user-blobs
wrangler secret put SESSION_SIGNING_KEY      # a long random string (HMAC session key)
wrangler secret put GOOGLE_CLIENT_ID         # OAuth Web client id (also public to the SPA)
```

Create the Google OAuth **Web** client (Google Cloud Console) and add the Worker's
origin to its authorized JavaScript origins.

**Each deploy** — the web build must receive the sync env at build time (point
`VITE_SYNC_API_URL` at this Worker's own origin so the SPA and `/api` stay same-origin):

```sh
VITE_SYNC_API_URL=https://september-server.<account>.workers.dev \
VITE_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com \
pnpm deploy            # = sync:assets (build web + copy dist/client → ./public) then wrangler deploy
```

`pnpm sync:assets` alone rebuilds and stages assets without deploying. Leaving the two
`VITE_*` vars unset produces a local-only build (no sign-in/sync) — the app still works
fully offline.

## Layout

| File | Purpose |
|---|---|
| [src/index.ts](src/index.ts) | Worker entry: routing, edge auth, R2 blob handlers |
| [src/auth.ts](src/auth.ts) | Session token (HMAC) + Google ID-token (OIDC) verification |
| [src/user-manager-do.ts](src/user-manager-do.ts) | Common DO: user registry + token issuance |
| [src/user-data-do.ts](src/user-data-do.ts) | Per-user DO: SQLite + push/pull sync |
| [src/types.ts](src/types.ts) | `Env` bindings + constants |
| [wrangler.jsonc](wrangler.jsonc) | Bindings, DO migrations, assets, R2 |

## Status

Client sync engine, Google sign-in, R2 audio blob mirroring, and single-origin asset
serving are wired (see `apps/web/src/packages/sync`). Remaining follow-up: guest →
account data migration on first sign-in. See `docs/plans/2026-06-26-cloudflare-do-backend.md`.
