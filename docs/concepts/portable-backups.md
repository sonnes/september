---
title: Portable backups
description: The browser and desktop apps exchange one JSON backup without moving secrets or device-local state.
package: core, app-ui, desktop, web
---

# Portable backups

Settings > Data creates one JSON file. A user can restore the file in the
browser app or the Mac app.

The top-level envelope names the format version, export time, source app, and
app version. Version 2 contains these values:

- setup, speech, dismissed ideas, space modes, the new-space draft, panel
  state, and Present settings;
- all spaces, Talk messages, Agent messages, notes, saved phrases, and usage
  events.

The parser still accepts version 1. It upgrades that file in memory with an
empty Agent transcript.

The setup object contains `defaultModel` and `suggestionsModel`. The second
value is null when Suggestions use the default. Each non-null value contains
one service and one model ID.

Import converts the older `writingService` and `writingModel` fields to
`defaultModel` when that field is absent. A missing `suggestionsModel` defaults
to null. The parser validates the converted values and preserves the setup
owner ID, which both apps use to find restored rows.

The file does not contain provider keys. It also excludes the selected audio
output, last path, migration state, cached speech files, and local message
audio paths. The Mac app keeps provider keys in the Keychain. The browser
keeps its keys outside the portable set in IndexedDB.

## Export

Each repository reads a consistent snapshot. Core writes each collection in
identifier order and checks nothing. The downloaded file is named
`september-backup-YYYY-MM-DD.json`.

Some older Mac profiles have no owner ID in the setup value. Desktop export
uses the current Mac login name in the backup without changing the stored
value.

Older desktop profiles can also name the retired Camera panel tab. An import
changes this tab to Phrases. An export writes the value the app holds.

The JSON is readable text and is not encrypted. It can contain private
Talk messages, Agent messages, and notes. The Data screen tells the user to
keep it in a private place.

## Import

Core reads the complete file before the screen offers the replace action. The
envelope must name a September backup with format version 1 or 2. A file that
fails this test is refused with one message.

Core then reads each setting and each row on its own. It checks identifiers,
timestamps, row types, unique IDs, space references, Agent tool state, and
route-safe space titles. A setting with an error returns to its default value.
A row with an error is left out, with the rows that need it. It also repairs
the retired Camera tab from older desktop backups. Unknown fields do not enter
storage.

The screen shows the source, export time, row counts, and how many entries
have errors. Import needs a second confirmation because it replaces portable
settings and all domain data. It does not merge rows.

An accessible activity log shows file reading, validation, download preparation,
and restore progress. It includes skipped-entry counts and keeps errors visible
until the next attempt. The log stays in memory and clears after the import reload.

IndexedDB uses one write transaction across the settings and domain stores.
SQLite uses one database transaction. A write failure keeps the current data. A successful import reloads the application.
