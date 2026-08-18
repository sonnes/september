---
title: Tauri desktop app with Rust-owned SQLite
description: Package the existing React UX as a Tauri app whose data and files are available only through Rust RPC.
---

# Tauri desktop app with Rust-owned SQLite

## Goal

Ship the existing September web UX as a Tauri desktop app. Keep React components and routes shared with the web build while moving desktop persistence behind Rust commands.

## Assumptions

- The first packaged target is macOS, but the Rust and Tauri code remains portable to Windows and Linux.
- "Skip browser AI" means the desktop build excludes on-device browser model providers. Remote API-backed AI and speech providers remain available.
- The web build keeps IndexedDB for persistence. Shared React hooks use TanStack Query and select a browser or Tauri data client at build time.
- Existing signed-in data can return through cloud sync. Migrating unsynced browser-only IndexedDB data into the desktop app is outside this change.

## Architecture

```text
Shared React components and routes
             |
      TanStack Query hooks
             |
       platform data client
        /                \
Browser IndexedDB      Tauri invoke RPC
                             |
                         Rust services
                        /             \
                  SQLite records     regular files
```

TanStack Query is a cache and async-state layer, not the source of truth. Desktop commands own validation, transactions, migrations, and path resolution. The webview does not receive SQL or filesystem plugin permissions.

## Storage

SQLite stores application records, persisted settings, sync metadata, and file metadata. The schema keeps the current collection identity so the existing cloud sync protocol can continue to move JSON records.

Regular files store audio, uploads, and generated exports under Tauri's application-local-data directory. SQLite stores only opaque file IDs, relative filenames, media types, sizes, and timestamps. Rust validates every file ID and never accepts an arbitrary storage path from the webview.

## RPC surface

- Record queries and mutations for spaces, messages, notes, saved phrases, account settings, and usage.
- Sync commands for reading the outbox and atomically applying remote changes.
- Binary file write, read, delete, and export commands.
- Rust events that identify invalidated query-key prefixes after sync or another window changes data.

The TypeScript client exposes domain-shaped methods. Components do not call `invoke` directly.

## TanStack Query behavior

- Use stable domain keys such as `['spaces']`, `['messages', spaceId]`, and `['notes', spaceId]`.
- Configure local data operations with `networkMode: 'always'` so offline status cannot pause SQLite or IndexedDB work.
- Preserve immediate interaction with optimistic cache updates and rollback on failure.
- Invalidate only affected key prefixes after mutations and Rust change events.
- Keep the browser adapter behind the same query functions so React components have one data contract.

## Desktop build

- Add the Tauri v2 shell at `apps/web/src-tauri/` and point it at the existing Vite dev server and SPA output.
- Add dedicated desktop dev and build scripts.
- Produce `index.html` for the packaged SPA without changing browser routing.
- Exclude WebLLM, browser Whisper/Transformers, Kokoro, and their workers/models from the Tauri bundle through a desktop provider registry selected at build time.
- Keep existing layout, styles, accessibility behavior, and routes.

## Test-first implementation

1. Add failing Rust repository tests for migrations, record CRUD, tombstones, outbox transactions, and file lifecycle.
2. Implement the minimum SQLite repository and regular-file service that passes those tests.
3. Add failing TypeScript tests for RPC serialization, platform selection, query keys, invalidation, and optimistic mutations.
4. Implement the Tauri client and TanStack Query hooks while retaining the browser adapter.
5. Add failing build tests for desktop SPA output and browser-AI exclusion, then wire Tauri and the desktop provider registry.
6. Verify web tests, lint, production builds, Rust tests, Clippy, and a packaged Tauri build.

## Completion criteria

- The normal web build still passes and retains its current persistence behavior.
- The desktop build renders the same React UX.
- Desktop record and settings operations persist in SQLite only through Rust commands.
- Desktop file bytes persist as regular files only through Rust commands.
- TanStack Query drives component reads, mutations, optimistic state, and invalidation.
- Browser-local AI code is absent from the desktop production bundle.
- No SQL or filesystem plugin capability is exposed to the webview.

