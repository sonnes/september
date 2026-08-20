# September desktop backend

This Tauri v2 backend belongs to the independent app in `apps/desktop`. It keeps
desktop storage behind Rust commands. The webview has no direct SQL or
filesystem access.

## Run backend checks

Run these commands from this directory:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

Use `pnpm tauri:dev` or `pnpm tauri:build` from `apps/desktop` to run or package
the complete application. The desktop UI has its own Vite entry point and does
not load routes or packages from `apps/web`.

## Understand storage

Rust opens `september.sqlite3` in Tauri's application-local-data directory. The
migrations create tables for records, settings, and file metadata. Version 2
removes the retired cloud-sync outbox and metadata tables.

The `os_user_get` command reads the current OS account. The account ID becomes the desktop record ID. The display name initializes the September profile name.

File bytes live under the `files/` subdirectory. The RPC surface accepts only generated UUIDs. It never accepts a path from the webview.

All records remain local to this database. Deleted records remain as local
tombstones so list and get operations have consistent behavior.

## Call the RPC API

Record commands accept a `request` object. Times are Unix epoch milliseconds, and field names use camel case.

| Command             | Request                                         | Response                   |
| ------------------- | ----------------------------------------------- | -------------------------- |
| `record_list`       | `{ collection, includeDeleted? }`               | `Record[]`                 |
| `record_get`        | `{ collection, id, includeDeleted? }`           | `Record \| null`           |
| `record_put`        | `{ collection, id, data, version?, updatedAt }` | `Record`                   |
| `record_delete`     | `{ collection, id, version?, updatedAt }`       | Tombstone `Record`         |
| `record_batch`      | `{ writes }`                                    | `Record[]`                 |
| `setting_get`       | `{ key }`                                       | JSON value or `null`       |
| `setting_put`       | `{ key, value }`                                | Stored JSON value          |
| `setting_delete`    | `{ key }`                                       | `boolean`                  |
| `os_user_get`       | None                                            | `{ id, name }`             |
| `open_external`     | `{ url }`                                       | `null` after opening       |

A `Record` is an envelope with `collection`, `id`, `data`, `version`,
`updatedAt`, `deleted`, and `sequence` fields. `record_batch` accepts `put` and
`delete` writes and commits all of them in one SQLite transaction.

`file_write` is different because it uses Tauri's raw binary transport. Pass a `Uint8Array` as the invoke body, with `content-type` and `x-september-file-kind` headers. It returns file metadata without a path. `file_read`, `file_get`, `file_list`, and `file_delete` accept opaque IDs through a `request` object.

`file_export` also accepts a raw `Uint8Array`. Set `content-type` and `x-september-suggested-name` headers. Rust sanitizes both values, opens the native save dialog, and returns `true` after saving or `false` after cancellation. The command never accepts or returns a path.

`open_external` sends HTTP, HTTPS, and email links to the operating system. Rust rejects relative URLs and all other schemes before it calls the native opener. This keeps provider and documentation links out of the privileged webview without exposing a general shell command.

Rust emits `september://records-changed`, `september://files-changed`, and `september://settings-changed` after successful mutations. The React data layer uses these events for targeted TanStack Query invalidation.
