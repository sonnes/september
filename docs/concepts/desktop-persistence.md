---
title: Desktop settings persistence
description: The independent Tauri app stores settings as JSON values in one SQLite table.
package: desktop
---

# Desktop settings persistence

The desktop app starts with one SQLite database and one persisted entity.
Each future entity gets its own table instead of sharing a generic records
table.

## Store settings

Rust opens `september.sqlite3` in Tauri's application-local-data directory.
The `settings` table maps a unique text key to a JSON value. SQLite validates
the stored JSON, and Rust limits keys to 256 bytes.

The webview can get, put, and delete settings through Tauri commands. Successful
writes emit `september://settings-changed` so ported screens can refresh the
affected keys.

## Remove the generic backend

Schema version 3 preserves valid settings from the former backend. The migration
then removes the `records`, `file_metadata`, `outbox`, and `sync_metadata`
tables. Legacy file bytes remain on disk but are no longer managed by the app.

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
