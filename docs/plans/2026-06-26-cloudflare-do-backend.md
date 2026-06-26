# Design Doc — Cloudflare Durable Objects Backend for September

> **Status:** backend implemented in `apps/server/` (Worker + both DOs + R2 + Google
> auth + sync, 35 tests passing). Client sync-engine wiring, the Google sign-in UI, and
> the Vercel→Cloudflare deploy move are the remaining follow-ups. See
> `apps/server/README.md`.

## Context

September is today a **pure local-first SPA**: TanStack Start (SPA mode) on Vite,
all data in IndexedDB via TanStack DB, a single implicit user
(`LOCAL_USER = { id: 'local-user' }`), **no auth, no server, no sync, no backup**.
Audio/reel blobs live in a separate IndexedDB store (`september-audio`). Deploy is
a static SPA on Vercel.

We want a backend that gives each user **durable server-side storage, multi-device
sync, and blob storage**, without losing the offline-first robustness that matters
for ALS/MND users.

**Shape (per the request):** each user gets a **separate SQLite + a separate blob
folder**; **one common Durable Object handles user management**.

**Decisions (confirmed with user):**
- Sync model: **local-first + sync** — IndexedDB stays primary; DO is the sync/backup target.
- Auth: **Google login only** (Google OAuth / OpenID Connect), via the common
  user-management DO. No email sending required.
- Scope: **design doc only** (this document) — no code this round.
- Blobs: **R2, one bucket, per-user key prefix** (`users/{userId}/…`).

**Deliverable of this task:** save this design doc into the repo at
`docs/plans/2026-06-26-cloudflare-do-backend.md`. No implementation code.

---

## Why these Cloudflare primitives fit (from CF docs)

- **Durable Object = compute + private SQLite, addressed by name** (`idFromName(x)`).
  The 500-per-account cap is on DO **classes (types)**, not instances — instances are
  **unlimited**. So "one SQLite per user" = a **single `UserDataDO` class, one instance
  per `userId`**. Per-object SQLite up to **10 GB** (paid; 1 GB free). ~1000 req/s soft
  cap per instance — irrelevant per single user.
- **R2**: 1M buckets allowed, but real folders don't exist — only **key prefixes**. So
  "separate bucket folder per user" = **one shared bucket, prefix `users/{userId}/…`**.
  Up to 5 TiB/object.
- **Workers static assets**: one Worker can **serve the SPA** (`not_found_handling:
  "single-page-application"`) **and** run `/api/*` server code **and** host the DOs +
  R2 binding — single origin, no CORS. This lets Cloudflare replace the Vercel deploy.

---

## Architecture

```
                 ┌─────────────────────── Cloudflare Worker ───────────────────────┐
  Browser SPA    │  fetch():                                                        │
  (IndexedDB,    │   /api/auth/*   → UserManagerDO (singleton)                      │
   primary) ─────┼─▶ /api/sync/*   → resolve userId from session → UserDataDO(userId)│
                 │   /api/blobs/*  → resolve userId → R2 (users/{userId}/…)         │
                 │   else          → env.ASSETS.fetch()  (serve SPA)                │
                 │                                                                   │
                 │  ┌── UserManagerDO ──┐   ┌── UserDataDO(userId) ──┐   ┌── R2 ──┐  │
                 │  │ common, 1 instance│   │ 1 instance per user    │   │ 1 bucket│ │
                 │  │ SQLite: users     │   │ SQLite: account,spaces,│   │ prefix  │ │
                 │  │  (google sub→id), │   │  messages,saved_phrases,│  │ per user│ │
                 │  │  revoked_tokens   │   │  notes  (+ sync cursor) │  │         │ │
                 │  └───────────────────┘   └────────────────────────┘   └─────────┘ │
                 └───────────────────────────────────────────────────────────────────┘
```

### 1. Worker entry + routing (`wrangler.jsonc`, `src/worker/index.ts`)
- Bindings: DO namespaces `USER_MANAGER`, `USER_DATA`; R2 bucket `USER_BLOBS`;
  `assets` binding pointing at `dist/client` with
  `not_found_handling: "single-page-application"`.
- `run_worker_first: ["/api/*"]` so the SPA fallback doesn't swallow API calls.
- Every `/api/sync/*` and `/api/blobs/*` request validates a **stateless signed token**
  at the Worker edge (HMAC/JWT, see Security) to extract `userId` — **without calling
  `UserManagerDO`** — then routes to `USER_DATA.get(idFromName(userId))` or to R2. The
  common DO is touched only during login, not on every request.
- **Preserve cross-origin isolation** (COOP/COEP/CORP headers) on asset responses —
  WebLLM + ffmpeg.wasm need `SharedArrayBuffer`. Currently set in `vercel.json` +
  `vite.config.ts`; on Workers, set via a `_headers` file or in the fetch handler.

### 2. `UserManagerDO` — the one common DO (auth + user registry)
- Singleton: `USER_MANAGER.get(idFromName("global"))`.
- SQLite tables: `users(id, google_sub UNIQUE, email, created_at)`,
  `revoked_tokens(jti, expires_at)` (for logout-all).
- **Google login flow** (OAuth 2.0 / OIDC):
  1. Client runs **Google Identity Services** (Sign in with Google) → receives a Google
     **ID token** (a signed JWT with `sub`, `email`, `aud`, `iss`, `exp`).
  2. `POST /api/auth/google { idToken }` → Worker/DO **verifies the Google ID token**:
     signature against Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`,
     cached), `aud == our GOOGLE_CLIENT_ID`, `iss == accounts.google.com`, not expired.
  3. **Upsert user** keyed by Google `sub` → `userId`; mint our own **stateless signed
     session token** (HMAC/JWT carrying `userId` + `jti` + expiry); return
     `{ token, userId }`.
  4. Per-request auth happens at the **Worker edge** by verifying *our* token signature —
     it does **not** call this DO (see Security). Revocation list checked only on refresh.
- `userId` is a stable opaque id (used as the `idFromName` key for that user's data DO).
- **No email sending needed** — Google is the identity provider, so the Cloudflare
  email-sending question is moot for v1. (If passwordless email login is ever added later,
  Workers can't do SMTP and the `send_email` binding only reaches verified addresses, so it
  would need an HTTP email API like Resend — out of scope now.)

### 3. `UserDataDO` — per-user SQLite (one instance per user)
- `USER_DATA.get(idFromName(userId))` → that user's private SQLite.
- Tables mirror the existing client Zod schemas (1:1), every row carries
  `updated_at` + `version` (`versionKey`):
  - `account`  → `apps/web/src/packages/account/schema.ts`
  - `spaces`, `messages`, `saved_phrases` → `apps/web/src/packages/spaces/types/index.ts`
  - `notes` → `apps/web/src/packages/notes/types/index.ts`
  - **`analytics` stays local-only** (fire-and-forget; not worth syncing).
- Sync endpoints:
  - `POST /api/sync/push` — batch `[{ collection, op: upsert|delete, row, versionKey }]`.
  - `GET  /api/sync/pull?since=<cursor>` — rows changed since cursor; cursor is a
    monotonic per-DO sequence (or max `updated_at`).
- Conflict resolution: **last-write-wins by `version`/`updated_at`**, which reuses the
  `StoredItem.versionKey` mechanism already in
  `apps/web/src/packages/shared/lib/indexeddb/collection-v2.ts`.

### 4. R2 blobs (per-user prefix)
- One bucket bound `USER_BLOBS`. Keys: `users/{userId}/audio/{path}`,
  `users/{userId}/reels/{path}` — same path scheme `storage.ts` already uses, just
  namespaced under the user.
- `/api/blobs/*`: session → `userId` → authorize → `GET/PUT/DELETE` to R2 (or hand back
  short-lived signed URLs for large reel/audio transfers).

---

## Google OAuth setup (v1 auth)

- Create an **OAuth 2.0 Client ID** (Web application) in Google Cloud Console; set
  authorized JS origins / redirect to the app origin. `GOOGLE_CLIENT_ID` is public (used
  by GIS in the browser); the client secret is **not needed** for the ID-token flow
  (verification is signature-based against Google's JWKS).
- Client: Google Identity Services library renders the Sign-in button and yields an ID
  token; POST it to `/api/auth/google`.
- Server verifies the ID token (JWKS cached at the edge), then mints our own session token.
- No email sending, no Resend, no SMTP — Google is the IdP.

---

## Protecting the common DO (`UserManagerDO`)

The common DO is a **singleton** that every account routes through — both a security
target and a potential bottleneck. Protections:

**Not publicly addressable.** Durable Objects have no public endpoint; they're reachable
**only** through the Worker's bindings. No client can hit `UserManagerDO` directly — the
Worker fetch handler is the *only* ingress. Treat that boundary as the trust boundary and
re-validate/normalize all input inside the DO regardless.

**Keep it off the hot path (stateless tokens).** Login mints an **HMAC/JWT session
token** (signing key = Worker secret). `/api/sync/*` and `/api/blobs/*` verify the
signature **at the Worker edge** — so steady-state traffic never reaches the singleton,
removing it as a per-request DoS target and scaling bottleneck (the ~1000 req/s soft cap
no longer applies to normal use). The DO is hit only at login. Short token TTL + refresh;
`token_version`/`revoked_tokens` in the DO enables logout-all and revocation.

**Harden the public auth endpoint** (`/api/auth/google` — the only unauthenticated
surface):
- **Strict Google ID-token verification**: signature against Google's JWKS, `aud ==
  GOOGLE_CLIENT_ID`, `iss`, `exp`, and `email_verified`. Reject anything else — this is
  what stops forged logins.
- **Rate limiting** per-IP via Cloudflare Rate Limiting / WAF, plus a counter in the DO as
  defense-in-depth, to cap the cost of flooding the singleton.
- Optional **Cloudflare Turnstile** in front of the sign-in flow if abuse appears.

**Secrets**: our session-token signing key stored as a **Worker secret** (never in code or
client), rotatable. `GOOGLE_CLIENT_ID` is public by design. CORS locked to the app origin
(mitigated anyway by single-origin hosting).

**Future scaling**: if user-management ever outgrows one instance, shard the registry by a
hash of email/userId across N `UserManagerDO` instances — stateless tokens mean this only
affects login, not request throughput.

## Client integration (local-first + sync)

- IndexedDB stays the **primary** store; add a **sync engine** that wraps the existing
  collections built by `indexedDBCollectionOptionsV2()`:
  - On mutation, enqueue to a durable **outbox**; background flush → `/api/sync/push`.
  - On startup/online (and via `BroadcastChannel`), **pull** changes → apply with
    existing `acceptMutations()` / `versionKey` conflict logic.
- **Identity:** keep guest mode (`LOCAL_USER`) fully local until sign-in. On first
  sign-in, **migrate local rows to the user's `UserDataDO`** via an initial push, then
  bind collections to the real `userId`.
- **Audio:** extend `apps/web/src/packages/audio/storage.ts` to mirror blobs to R2 under
  the user prefix (keep IndexedDB as the offline cache).

---

## Deployment change

- **Move from Vercel → a single Cloudflare Worker** (assets + DO + R2, one origin → no
  CORS for `/api/*`). `build.mjs` already emits `dist/client`; point the `assets`
  directory there.
- Keep `wrangler dev` for local (DO + R2 are simulated locally).
- **Requires Workers Paid** for production storage (free tier caps DO storage at 5 GB
  account-wide).
- Re-create the COOP/COEP/CORP headers on Worker responses (parity with current
  `vercel.json`).

---

## Sizing / limits sanity check

| Concern | Limit | Our usage |
|---|---|---|
| DO classes / account | 500 paid | 2 (`UserManagerDO`, `UserDataDO`) |
| DO instances | unlimited | 1 per user |
| SQLite per DO | 10 GB paid | tiny per user |
| Req/s per DO instance | ~1000 soft | per single user — fine |
| R2 buckets | 1M | 1 (prefix per user) |
| R2 object size | 5 TiB | reels/audio well under |

---

## Risks / open questions (to resolve in the build phase)

- **Guest → account migration** semantics (dedup, conflicts on first push).
- **Session security**: our token storage on client, expiry/rotation, logout-all via
  `revoked_tokens`; Google ID-token verification correctness (JWKS caching/rotation).
- **COOP/COEP preservation** on the Worker (regression breaks WebLLM/ffmpeg).
- **Vercel vs full CF move** — recommend full move so assets + API share an origin.
- **Pull cursor design** — monotonic seq vs `updated_at`; deletions need tombstones.

---

## Verification

This round produces a **document only** — no code to run. Verify by review:
1. Save the doc to `docs/plans/2026-06-26-cloudflare-do-backend.md`.
2. Confirm the architecture answers all requirements: per-user SQLite ✓, per-user R2
   prefix ✓, one common user-management DO (protected) ✓, Google login ✓, single-Worker
   hosting ✓.
3. Follow-up (separate plan): a scaffolding plan that stands up the Worker, both DO
   classes, R2 binding, `wrangler.jsonc`, `/api/*` routes, and the client sync engine.
