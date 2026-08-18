# September desktop backend

This Tauri v2 shell packages the shared React interface and keeps desktop storage behind Rust commands. The webview has no direct SQL or filesystem access.

## Run backend checks

Run these commands from this directory:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

Use the desktop scripts in `apps/web/package.json` to run or package the complete application. Tauri starts Vite in `tauri` mode so browser-only AI providers do not load in the desktop webview.

## Understand storage

Rust opens `september.sqlite3` in Tauri's application-local-data directory. The migration in `migrations/` creates tables for records, tombstones, the sync outbox, settings, sync metadata, and file metadata.

The `os_user_get` command reads the current OS account. The account ID becomes the desktop record ID. The display name initializes the September profile name.

File bytes live under the `files/` subdirectory. The RPC surface accepts only generated UUIDs. It never accepts a path from the webview.

Local writes to these collections enter the durable sync outbox:

- `user-account`
- `spaces`
- `messages`
- `saved-phrases`
- `documents`

All other collections remain local. This includes `audio-file-aliases`, `autocomplete-snapshots`, and `analytics-events`.

## Call the RPC API

Record commands accept a `request` object. Times are Unix epoch milliseconds, and field names use camel case.

| Command             | Request                                         | Response                   |
| ------------------- | ----------------------------------------------- | -------------------------- |
| `record_list`       | `{ collection, includeDeleted? }`               | `Record[]`                 |
| `record_get`        | `{ collection, id, includeDeleted? }`           | `Record \| null`           |
| `record_put`        | `{ collection, id, data, version?, updatedAt }` | `Record`                   |
| `record_delete`     | `{ collection, id, version?, updatedAt }`       | Tombstone `Record`         |
| `sync_outbox_list`  | `{ limit? }`                                    | `OutboxMutation[]`         |
| `sync_outbox_ack`   | `{ outboxIds }`                                 | Removed row count          |
| `sync_apply_remote` | `{ mutations, cursor }`                         | `{ applied, collections }` |
| `setting_get`       | `{ key }`                                       | JSON value or `null`       |
| `setting_put`       | `{ key, value }`                                | Stored JSON value          |
| `setting_delete`    | `{ key }`                                       | `boolean`                  |
| `sync_metadata_get` | `{ key }`                                       | JSON value or `null`       |
| `sync_metadata_put` | `{ key, value }`                                | Stored JSON value          |
| `os_user_get`       | None                                            | `{ id, name }`             |
| `open_external`     | `{ url }`                                       | `null` after opening       |

A `Record` is an envelope with `collection`, `id`, `data`, `version`, `updatedAt`, `deleted`, and `sequence` fields. Remote batches apply atomically and do not enter the outbox.

`file_write` is different because it uses Tauri's raw binary transport. Pass a `Uint8Array` as the invoke body, with `content-type` and `x-september-file-kind` headers. It returns file metadata without a path. `file_read`, `file_get`, `file_list`, and `file_delete` accept opaque IDs through a `request` object.

`file_export` also accepts a raw `Uint8Array`. Set `content-type` and `x-september-suggested-name` headers. Rust sanitizes both values, opens the native save dialog, and returns `true` after saving or `false` after cancellation. The command never accepts or returns a path.

`open_external` sends HTTP, HTTPS, and email links to the operating system. Rust rejects relative URLs and all other schemes before it calls the native opener. This keeps OAuth and documentation links out of the privileged webview without exposing a general shell command.

Rust emits `september://records-changed`, `september://files-changed`, and `september://settings-changed` after successful mutations. The React data layer uses these events for targeted TanStack Query invalidation.
