# September Desktop

September Desktop is an independent Tauri application. Its first ported screen
is a four-step onboarding flow, sized for the 13-inch iPad landscape window.

The UI uses Tailwind CSS v4 and TanStack Router. Each step is a route:
`/welcome`, `/profile`, `/mode`, and `/finish`. The router uses hash history,
because Tauri serves the built files from the asset protocol. A step opens only
after the answers it needs exist. The answers stay in memory until account
persistence is ported.

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

The Rust backend stores settings in one SQLite table. See
[`src-tauri/README.md`](src-tauri/README.md) for its RPC contract.
