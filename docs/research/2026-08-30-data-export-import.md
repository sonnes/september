---
title: Export and import all September data
description: One versioned JSON backup can move portable settings and user data between the browser and desktop apps without moving secrets or caches.
date: 2026-08-30
package: core, app-ui, desktop, web
---

# Export and import all September data

## Recommendation

Add one **Data** section under Settings in the browser and desktop apps. This
section exports one JSON backup and restores the same file on either app.

The first version must restore data by replacement. It must not merge two data
sets. A merge needs conflict rules for identifiers, space titles, drafts, and
usage events. These rules add risk without making a backup more reliable.

The backup must contain all portable user data and settings. It must not contain
API keys, generated speech, device identifiers, or internal migration state.
The import keeps those local values unchanged.

## Current storage

The two application UIs share domain shapes, but their storage engines differ.
The browser uses one IndexedDB database. The desktop app uses SQLite and the
macOS Keychain.

| Current value | Browser | Desktop | Backup |
| --- | --- | --- | --- |
| Setup profile and service choices | IndexedDB `settings` | SQLite `settings` | Include |
| Speech voice and sound settings | IndexedDB `settings` | SQLite `settings` | Include |
| Dismissed ideas | IndexedDB `settings` | SQLite `settings` | Include |
| Space modes | IndexedDB `settings` | SQLite `settings` | Include |
| New-space draft | IndexedDB `settings` | SQLite `settings` | Include |
| Panel state | IndexedDB `settings` | SQLite `settings` | Include |
| Presentation tone and speech choice | IndexedDB `settings` | SQLite `settings` | Include |
| Spaces | IndexedDB `spaces` | SQLite `spaces` | Include |
| Messages | IndexedDB `messages` | SQLite `messages` | Include |
| Notes | IndexedDB `notes` | SQLite `notes` | Include |
| Saved phrases | IndexedDB `saved_phrases` | SQLite `saved_phrases` | Include |
| Local usage events | IndexedDB `analytics_events` | SQLite `analytics_events` | Include |
| Provider API keys | IndexedDB `settings` | macOS Keychain | Exclude |
| Selected audio output | IndexedDB `settings` | SQLite `settings` | Exclude |
| Last open route | IndexedDB `settings` | SQLite `settings` | Exclude |
| Legacy migration state | IndexedDB `settings` | Not applicable | Exclude |
| Generated speech and timing files | IndexedDB blob stores | Application audio directory | Exclude |
| Voice-clone recordings | Memory | Memory | Exclude |
| Provider voices and cloned voices | Provider account | Provider account | Exclude |

The generated speech is a bounded cache. September can create it again from
the message text and speech settings. The autocomplete model also learns from
messages at start, so it has no separate durable user snapshot.

The native floating keyboard has no user persistence. Its panels are bundled
JSON resources. It needs no export or import work for this version.

## Portable backup contract

Use one explicit and versioned contract in
`packages/core/rules/backup.ts`. Do not export raw database files or every row
from the settings table.

An explicit settings object prevents a future setting from leaking into a
backup by accident. It also keeps browser provider keys outside the file.

```json
{
  "format": "september-backup",
  "formatVersion": 1,
  "exportedAt": "2026-08-30T12:00:00.000Z",
  "source": "web",
  "appVersion": "0.1.0",
  "settings": {
    "setup": null,
    "speech": null,
    "dismissedIdeas": [],
    "spaceModes": {},
    "newSpaceDraft": "",
    "panel": { "open": false, "tab": "phrases" },
    "present": { "tone": "indigo", "spoken": true }
  },
  "spaces": [],
  "messages": [],
  "notes": [],
  "savedPhrases": [],
  "usageEvents": []
}
```

The domain rows can keep their current snake-case field names. Both app
repositories already use those names across the platform boundary.

The encoder must sort each collection by its identifier. This order makes two
exports easy to compare. The file name must use
`september-backup-YYYY-MM-DD.json`.

The file is plain JSON and contains private writing. The export screen must
state that the file is not encrypted. Password encryption can be a later
version because it adds password recovery and cross-platform cryptography.

## Import contract

The app must read and validate the complete file before it changes storage.
An invalid file must leave every current value unchanged.

Validation must cover these rules:

- The format name is `september-backup`.
- The format version is a supported integer.
- Each collection is an array with unique row identifiers.
- Each identifier contains 1 to 256 bytes.
- Each timestamp is a finite, nonnegative integer.
- Each update timestamp is not earlier than its create timestamp.
- Each phrase kind is `phrase` or `starter`.
- Each usage event type exists in the shared `UsageEventType` union.
- Each scoped message, note, and phrase refers to an included space.
- Each saved setting has the expected shape and bounded numeric values.
- Each space title produces a unique route slug.

The parser must reject a newer format version with a clear message. A future
version can add a pure migration from an older parsed value to the current
contract.

After validation, the screen must show this preview:

- The export date and source app.
- The number of spaces, messages, notes, saved phrases, and usage events.
- A statement that the import replaces the current portable data.
- A statement that API keys and this device's audio output do not change.

The final action must use an alert dialog and the destructive button style.
The action text can be **Replace my data**. The dialog can also point to the
export action for a backup of the current data.

## Atomic replacement

The browser repository can replace the data in one IndexedDB transaction. The
transaction must include settings, spaces, messages, notes, saved phrases, and
usage events.

The transaction must erase only the portable setting keys. It must leave
`provider-keys`, `audio-output`, and `legacy-migration` unchanged. It must also
leave both blob stores unchanged.

The desktop repository can use one SQLite transaction. It must erase the child
tables before the spaces table, insert spaces before their children, and insert
usage events and settings in the same transaction.

The desktop transaction must leave `audio-output` unchanged. Provider keys are
already outside SQLite, so the Keychain does not change.

If any write fails, IndexedDB must abort or SQLite must roll back. The app must
show the error and keep the import preview available.

After a successful import, the app must reload the application shell. This
reload refreshes module-level settings caches, route guards, and React Query
data from the new storage.

## Cross-platform behavior

The browser and desktop app must accept the same backup file. A user can export
from one app and import into the other.

The import must preserve the saved owner identifier. The setup setting uses
that identifier, so `currentUserId()` continues to find the imported spaces.

The import must preserve service choices even when the destination cannot use
them. For example, the browser can preserve Apple Intelligence as the chosen
writing service. Its existing unavailable state then explains the limitation.

The import must remove any `audio_path` value from a message. These paths name
machine-local cache files and current code no longer writes them.

API keys never cross in a backup. A new device requires the user or caregiver
to reconnect OpenRouter and ElevenLabs. Cloned voices remain in the ElevenLabs
account and appear again after that connection.

## Application boundaries

`packages/core/rules/backup.ts` must own the portable TypeScript contract,
parser, validator, deterministic encoder, file name, and preview summary. This
module stays pure and has no browser or Tauri APIs.

Each application must add `src/services/backup.ts` behind the existing
`@platform/*` alias. The service reads the local repository and applies the
validated replacement.

The browser repository needs bulk snapshot and replacement methods. The bulk
snapshot must read every domain row, not only the current user's visible rows.

The Rust repository needs matching backup types and transactional methods.
Two Tauri commands can expose them as `backup_export` and `backup_import`.

`packages/app-ui/pages/settings.tsx` can own the shared Data screen. Both route
graphs and both settings navigation files must add `/settings/data`. The typed
icon record in `packages/app-ui/layouts/settings.tsx` must add the same path.

The screen can use a native file input with an accessible 44px label. It needs
no new file-picker dependency. Both current WebViews already support browser
downloads for note and usage exports.

## Existing compatibility fault

The shared `UsageEventType` union has five values. The Rust repository accepts
only `message_sent`, `ai_generation`, and `tts_generation` today.

The desktop app also records `note_present` and `note_export`, but Rust rejects
those writes. The caller hides this error. A browser backup can therefore hold
events that the current desktop validator rejects.

The implementation must align the Rust validator with the shared five-value
contract before it adds backup import.

## Test-first implementation sequence

The repository requires strict test-driven development. Add each failing test
before its implementation change.

1. Add core contract tests in `packages/core/rules/backup.test.ts`.
   Cover a valid round trip, stable ordering, summaries, invalid versions,
   duplicate identifiers, broken references, invalid settings, and all five
   usage event types.
2. Add browser repository tests in
   `apps/web/src/services/repository.test.ts`.
   Cover a complete snapshot, excluded settings and blobs, replacement, and an
   aborted transaction that keeps the old data.
3. Add Rust repository tests in
   `apps/desktop/src-tauri/src/repository.rs`.
   Cover a complete round trip, retained device settings, foreign-key order,
   and rollback after one invalid row.
4. Add desktop command registration and service tests in
   `apps/desktop/tests/`.
5. Add route, navigation, and shared Data screen tests for both applications.
   Cover the preview, private-file warning, destructive confirmation, error
   state, success state, and reload request.
6. Add one cross-platform fixture. Export it through one adapter and import it
   through the other adapter without data loss.

## Documentation work with implementation

The finished change must update these documents:

- Root, web, desktop, core, and application UI READMEs.
- `docs/concepts/web-persistence.md`.
- `docs/concepts/desktop-persistence.md`.
- A new concept document for portable backup and restore.
- The shared Help catalog with a task guide for export and import.

## Acceptance criteria

- One browser backup imports into desktop, and one desktop backup imports into
  the browser.
- The backup contains every portable setting and every domain row.
- The backup contains no API key, cache file, device identifier, or migration
  state.
- Invalid input changes no data.
- A failed write changes no data.
- Import replaces data only after an explicit destructive confirmation.
- A successful import reloads the app and shows the restored data.
- Existing provider connections and the selected audio output remain unchanged.

