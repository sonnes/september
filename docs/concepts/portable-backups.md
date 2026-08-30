---
title: Portable backups
description: The browser and desktop apps exchange one validated JSON backup without moving secrets or device-local state.
package: core, app-ui, desktop, web
---

# Portable backups

Settings > Data creates one JSON file. A user can restore the file in the
browser app or the Mac app.

The top-level envelope names the format version, export time, source app, and
app version. Version 1 contains these values:

- setup, speech, dismissed ideas, space modes, the new-space draft, panel
  state, and Present settings;
- all spaces, messages, notes, saved phrases, and usage events.

The file does not contain provider keys. It also excludes the selected audio
output, last path, migration state, cached speech files, and local message
audio paths. The Mac app keeps provider keys in the Keychain. The browser
keeps its keys outside the portable set in IndexedDB.

## Export

Each repository reads a consistent snapshot. Core validates the result and
writes each collection in identifier order. The downloaded file is named
`september-backup-YYYY-MM-DD.json`.

Some older Mac profiles have no owner ID in the setup value. Desktop export
uses the current Mac login name in the backup without changing the stored
value.

Older desktop profiles can also name the retired Camera panel tab. Export and
import change this tab to Phrases. Other unsupported panel tabs remain invalid.

The JSON is readable text and is not encrypted. It can contain private
messages and notes. The Data screen tells the user to keep it in a private
place.

## Import

Core parses and validates the complete file before the screen offers the
replace action. Validation checks the format version, settings, identifiers,
timestamps, row types, unique IDs, space references, and route-safe space
titles. It also repairs the retired Camera tab from older desktop backups.
Unknown fields do not enter storage.

The screen shows the source, export time, and row counts. Import needs a second
confirmation because it replaces portable settings and all domain data. It
does not merge rows.

IndexedDB uses one write transaction across the settings and domain stores.
SQLite uses one database transaction. A validation or write failure keeps the
current data. A successful import reloads the application.
