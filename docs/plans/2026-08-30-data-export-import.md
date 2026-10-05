---
title: Add portable data export and import
description: Add one versioned backup format and atomic restore path for the browser and desktop apps.
date: 2026-08-30
status: approved
research: ../research/2026-08-30-data-export-import.md
---

# Add portable data export and import

## Outcome

The browser and desktop apps get one **Data** section in Settings. A user can
export portable settings and all domain rows to JSON. Either app can import the
same file.

Import replaces portable data after validation and explicit confirmation. It
does not change API keys, device output settings, caches, or migration state.

## Work

1. Add the pure backup contract to `@september/core`.
   - Define version 1 of the JSON format.
   - Validate settings, rows, identifiers, timestamps, references, and slugs.
   - Encode collections in a stable order.
   - Produce the file name and import summary.
2. Add atomic browser storage operations.
   - Read all portable settings and every domain row.
   - Remove machine-local `audio_path` values.
   - Replace portable settings and domain rows in one IndexedDB transaction.
   - Keep provider keys, audio output, migration state, and blob stores.
3. Add atomic desktop storage operations.
   - Add matching Rust backup types.
   - Export every SQLite domain row and the portable settings.
   - Replace those values in one SQLite transaction.
   - Keep the Keychain and the selected audio output.
   - Accept all five shared usage event types.
4. Add platform backup services.
   - Build the common envelope with the source app and version.
   - Download `september-backup-YYYY-MM-DD.json`.
   - Import only a value that passed the core parser.
5. Add the shared Data settings screen.
   - Add `/settings/data` to both route graphs and settings navigation lists.
   - Explain included and excluded data.
   - Show the selected file's date, source, and row counts.
   - Require destructive confirmation before replacement.
   - Reload the app after success.
6. Add a Help guide and update persistence documentation.

## Test order

Write each test before its implementation.

1. Core backup contract tests.
2. Browser repository snapshot and rollback tests.
3. Rust repository snapshot and rollback tests.
4. Desktop command and service contract tests.
5. Route, navigation, and shared screen tests.
6. Cross-platform fixture tests.

## Required checks

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
pnpm -C apps/web test
pnpm -C apps/web lint
pnpm -C apps/web build
pnpm -C apps/desktop test
pnpm -C apps/desktop build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
```

