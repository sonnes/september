# September Desktop

September Desktop is an independent Tauri application. Its React UI starts as
an empty surface so web screens can be ported into it one at a time.

## Run the app

Install Node.js 20 or later, pnpm, Rust, and the Tauri system dependencies.
Then run:

```sh
pnpm install
pnpm tauri:dev
```

The UI dev server uses `http://localhost:3010`. The main desktop window opens at
1376×1032, the project's 13-inch iPad landscape baseline.

## Check the UI

```sh
pnpm test
pnpm build
```

Run the Rust checks from `src-tauri/`:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

The Rust backend owns SQLite, local files, OS identity, and external-link
commands. See [`src-tauri/README.md`](src-tauri/README.md) for its RPC contract.
