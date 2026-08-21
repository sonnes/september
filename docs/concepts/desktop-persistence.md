---
title: Desktop persistence
description: The independent Tauri app stores settings and normalized domain data in SQLite.
package: desktop
---

# Desktop persistence

The desktop app stores settings and domain data in one SQLite database. Each
domain entity has its own table instead of sharing a generic records table.

## Store settings

Rust opens `september.sqlite3` in Tauri's application-local-data directory.
The `settings` table maps a unique text key to a JSON value. SQLite validates
the stored JSON, and Rust limits keys to 256 bytes.

The webview can get, put, and delete settings through Tauri commands. Successful
writes emit `september://settings-changed` so ported screens can refresh the
affected keys.

## Store domain data in columns

The `spaces` table stores space metadata. The `messages` and `notes` tables
store their domain fields in typed columns and reference `spaces` through an
optional foreign key. Deleting a space cascades to its messages and scoped
notes. Global messages and notes have no space and remain intact.

SQLite stores domain timestamps as Unix milliseconds. Composite indexes cover
the existing space-scoped message and note queries.

## Use typed domain commands

The webview lists, gets, puts, and deletes spaces, messages, and notes through
typed Tauri commands. A put sends a complete domain row. Rust validates its
identity and timestamps before SQLite inserts or replaces it.

Space lists belong to one user. Message and note lists can include every row or
filter by one space. Messages use conversation order, while spaces and notes
put the most recently updated row first.

A get returns `null` for a missing row. A delete returns `false` for a missing
row. SQLite rejects a scoped message or note when its parent space does not
exist.

## Start with the current schema

Schema version 1 creates `settings`, `spaces`, `messages`, and `notes` directly.
The desktop app does not migrate databases created by earlier backend versions.

## Keep browser storage separate

The browser app keeps its existing IndexedDB storage. The independent desktop
UI does not import the browser data layer.

## Run the desktop app

Install Rust and the Tauri system dependencies. Then run:

```sh
make desktop-dev
```

Create an installable bundle with:

```sh
make desktop-build
```
