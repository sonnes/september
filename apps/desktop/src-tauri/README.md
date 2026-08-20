# September desktop backend

This Tauri v2 backend gives the independent desktop UI one SQLite database.
Settings are the only persisted entity for now, so the database contains one
table and the command surface contains three settings operations.

## Run backend checks

Run these commands from this directory:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

Use `pnpm tauri:dev` or `pnpm tauri:build` from `apps/desktop` to run or package
the complete application.

## Understand storage

Rust opens `september.sqlite3` in Tauri's application-local-data directory.
The `settings` table stores a unique text key and a JSON value. Keys must
contain 1 to 256 bytes.

Schema version 3 converts the previous generic backend to settings-only
storage. It preserves valid settings, then removes the `records` and
`file_metadata` tables. It does not delete legacy files from disk.

## Call the settings API

Each command accepts a `request` object.

| Command          | Request          | Response             |
| ---------------- | ---------------- | -------------------- |
| `setting_get`    | `{ key }`        | JSON value or `null` |
| `setting_put`    | `{ key, value }` | Stored JSON value    |
| `setting_delete` | `{ key }`        | `boolean`            |

Successful writes emit `september://settings-changed` with the changed keys.
Deleting a missing setting returns `false` and does not emit an event.
