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

## Keep usage events for 90 days

The `analytics_events` table stores an event ID, user ID, event type, Unix
millisecond timestamp, and validated JSON payload. An index on user and
timestamp supports the Dashboard and Settings reports without scanning other
users or older periods.

Usage rows do not reference spaces. Deleting a conversation removes its
messages and notes, but it does not rewrite historical efficiency or service
totals.

The backend deletes events strictly older than 90 days when the app starts and
whenever usage is read or written. An event at the exact boundary remains. No
background worker is necessary, and a long-running app still cleans itself
when the next event or report arrives.

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

## Change a space with a patch

A put sends a complete row, so it needs one writer. A space has three: the user
renames it, a model writes its name and its note after the first message, and
the phrase sync counts the messages. Each writer holds a copy of the row from
the moment it started, and each one knows only its own fields.

`space_patch` changes only the fields it is given. One SQL statement writes
them, and a field that is absent keeps its value. Two writers that touch
different fields both keep their change. A put would let the last writer put
back the fields it read before the others wrote, and the user would watch a new
name turn back into `New space 2`.

A field is set, never cleared. No writer needs to empty one.

## Start with the current schema

Schema version 6 creates settings, domain rows, saved phrases, and analytics
events. The migrations use `CREATE TABLE IF NOT EXISTS`, so databases from
earlier desktop builds gain missing tables and keep existing settings.

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
