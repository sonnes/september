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

The Tauri commands prepare apfel automatically on an Apple Silicon Mac.
Run `pnpm apfel:prepare` from `apps/desktop` to prepare only the sidecar.

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

## Use the apfel API

The backend exposes `apfel_status` and `apfel_generate`. Both commands start
the sidecar on the first call and reuse it on later calls.

`apfel_status` takes no request. It returns this object:

```ts
type ApfelStatus = {
  supported: boolean;
  available: boolean;
  reason: string | null;
  model: string | null;
  version: string | null;
  context_window: number | null;
  prewarmed: boolean | null;
  supported_languages: string[];
};
```

`supported` is false when the current system cannot run the bundled provider.
`available` is false when Apple Intelligence cannot load its model.

Call `apfel_generate` with one `request` object:

```ts
type ApfelGenerateRequest = {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | { type: "json_schema"; name: string; schema: object };
};
```

The command returns the generated text and the token counts:

```ts
type ApfelGeneration = {
  text: string;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
```

The command rejects its promise when startup or generation fails. The error
keeps the message from the apfel OpenAI-compatible response.

## Understand the sidecar lifecycle

Rust starts one apfel server on a free loopback port. The server accepts one
generation request at a time.

Rust creates a new bearer token for each server process. It passes the token
through `APFEL_TOKEN`, not through a command argument.

The WebView cannot start shell commands or call the server directly. It uses
only the two Tauri commands. Rust restarts the sidecar when its health request
fails, and it stops the child process when the backend exits.

The bundle contains apfel v1.9.1 and its MIT license. The preparation script
makes sure that the downloaded archive and extracted binary match pinned
SHA-256 checksums.

Run the ignored live integration test on a supported Mac:

```sh
APFEL_BIN="$PWD/binaries/apfel-aarch64-apple-darwin" \
  cargo test --test apfel live_apfel_serves_a_completion_through_the_rust_client \
  -- --ignored --exact
```
