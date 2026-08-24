---
title: Replace the web app with the desktop UI
description: Port the desktop route tree and interface to the browser, backed by one native IndexedDB database and a one-time destructive legacy-data migration.
status: approved
---

# Replace the web app with the desktop UI

The web app will become the browser edition of the independent desktop app.
It will use the same screens, route paths, interaction rules, and visual
structure. Browser services replace Tauri commands, but the interface does not
grow a second product shape.

The current marketing, legal, display, presentation, preview, and compatibility
routes leave the web build. `/` follows the desktop launch rule: unfinished
setup opens `/welcome`; finished setup opens the last safe app route.

## Route tree

The browser exposes exactly these routes:

```text
/
├── /welcome
├── /profile
├── /mode
├── /connect
├── /finish
├── /dashboard
├── /spaces
├── /spaces/new
├── /spaces/$slug/talk
├── /spaces/$slug/notes
├── /spaces/$slug/notes/$noteSlug
├── /voice
├── /voice/clone
├── /help
└── /settings
    ├── /writing
    ├── /usage
    └── /connections/$provider
```

TanStack Router keeps browser history instead of the desktop hash history.
Every other route is removed rather than redirected.

## Source boundary

Port the desktop layouts, pages, blocks, rules, and route graph deliberately
into `apps/web`. The apps remain independent and do not import each other's UI
source.

Reuse the web app's shadcn primitives and design tokens. Port the desktop
autocomplete behavior, but use the web dictionary source rather than keeping a
third copy. React Query remains the UI cache and mutation-state layer.

Only service implementations vary by platform:

| Desktop service | Browser implementation |
| --------------- | ---------------------- |
| SQLite RPC | Native IndexedDB repository |
| Settings RPC | IndexedDB settings store |
| macOS system voice | Web Speech API |
| Native audio playback | HTML audio |
| Keychain-backed cloud providers | Browser-local provider settings |
| Open an external URL | `window.open` |
| Virtual microphone and camera | Same controls, reported unavailable with `aria-disabled` |

## One IndexedDB database

Open `september` with these object stores:

| Store | Key | Indexes |
| ----- | --- | ------- |
| `settings` | `key` | none |
| `spaces` | `id` | `user_id`, `updated_at` |
| `messages` | `id` | `space_id`, `created_at` |
| `notes` | `id` | `space_id`, `updated_at` |
| `saved_phrases` | `id` | `space_id`, `created_at` |
| `analytics_events` | `id` | `timestamp`, `[user_id, timestamp]` |

Use the desktop row shapes and millisecond timestamps. Keep compound writes
atomic: patching a space, replacing AI phrases, deleting a space and its child
rows, and pruning old usage events each use one read-write transaction.

The repository is a small native IndexedDB wrapper. Remove TanStack DB and the
current generic IndexedDB collection implementation after the new app no longer
imports them.

## One-time migration and cleanup

The import runs before the new app reads its repository.

1. Open the new database and set the migration state to `copying`.
2. Read the legacy databases without importing the old application modules.
3. Copy the account, spaces, messages, notes, saved phrases, and analytics rows
   with idempotent `put` operations.
4. Import the relevant UI state from browser storage into `settings`.
5. Convert persisted `Date` values to millisecond numbers and fill fields that
   older saved phrases do not hold.
6. Validate source identifiers, row counts, and child references against the
   new stores.
7. Set the migration state to `imported`.
8. Delete every legacy database.
9. Set the migration state to `clean` after all delete requests finish.

IndexedDB cannot make a transaction span separate databases. A crash during
copying therefore restarts the idempotent import. A deletion blocked by an old
tab leaves `imported` in place and retries cleanup on the next start; it never
imports twice after validation.

Migrate user-authored data from:

- `app-user-account`
- `app-spaces`
- `app-messages`
- `app-documents`
- `app-saved-phrases`
- `analytics`

Delete those databases plus the derived caches after validation:

- `september-autocomplete`
- `september-audio`

The old databases are not retained as a fallback.

## Test-first sequence

1. Write repository contract tests with `fake-indexeddb`, then implement the
   database schema and atomic operations.
2. Write migration tests that create the legacy layouts, verify conversion,
   simulate interruption, and verify cleanup.
3. Port the desktop rule tests to Vitest, then port the rules.
4. Port the route tree and assert that its path set matches the desktop app.
5. Port layouts, screens, and blocks in route order: setup, dashboard, spaces,
   Talk, Notes, Voice, Settings, and Usage.
6. Implement browser settings, AI, speech, cloning, playback, suggestions, and
   usage adapters behind the desktop service APIs.
7. Delete superseded routes, modules, storage code, and dependencies only after
   the replacement routes pass.
8. Update the web and root documentation, then run `pnpm test`, `pnpm lint`,
   and `pnpm build` from `apps/web`.

## Acceptance

- The browser route set equals the desktop route set.
- The browser draws the desktop UI and keeps its accessibility behavior.
- Reloading preserves setup, rows, drafts, panel state, speech settings, and
  the last safe route.
- Existing browser data appears once in the new stores.
- Legacy databases are deleted after validation.
- A failed or interrupted import loses no source data.
- Web tests, lint, and production build pass.
