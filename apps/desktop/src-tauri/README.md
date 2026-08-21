# September desktop backend

This Tauri v2 backend gives the independent desktop UI one SQLite database.
It stores settings, spaces, messages, and notes in separate tables. The command
surface currently contains three settings operations and one command that
reads the user name from the operating system.

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

The `spaces`, `messages`, and `notes` tables store domain fields in typed
columns. Messages and notes can belong to a space. Deleting a space deletes its
messages and scoped notes, while global messages and notes remain. Timestamps
are Unix milliseconds.

Schema version 1 creates all four tables. The app does not migrate databases
created by earlier backend versions.

## Call the settings API

Each command accepts a `request` object.

| Command          | Request          | Response             |
| ---------------- | ---------------- | -------------------- |
| `setting_get`    | `{ key }`        | JSON value or `null` |
| `setting_put`    | `{ key, value }` | Stored JSON value    |
| `setting_delete` | `{ key }`        | `boolean`            |

Successful writes emit `september://settings-changed` with the changed keys.
Deleting a missing setting returns `false` and does not emit an event.

## Read the user name

The `user_name` command takes no request. It returns the name that the
operating system holds for the signed-in user. The result is empty when the
system has no usable name. The onboarding screen then starts with an empty
field. The command keeps the first GECOS field and rejects the `Unknown`
placeholder.
