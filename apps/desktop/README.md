# September Desktop

September Desktop is an independent Tauri application. Its first ported screen
is an onboarding flow, sized for the 13-inch iPad landscape window.
The Rust backend also provides local text generation through a bundled apfel
sidecar on supported Macs.

The UI uses Tailwind CSS v4, shadcn/ui primitives, and TanStack Router. Each
step is a route: `/welcome`, `/profile`, `/mode`, `/connect`, and `/finish`.
Free setup skips `/connect`, so it shows four steps and advanced setup shows
five. `stepsFor` in `src/onboarding.ts` owns that rule, and the sidebar, the
guards, and both navigation directions all read it. The router uses hash history,
because Tauri serves the built files from the asset protocol. A step opens only
after the answers it needs exist. The answers stay in memory until account
persistence is ported.

The brand, the setup title, and the step list are in a left indigo sidebar.
Each step opens as an inset white card beside it. All sections on a step stay
open. There are no collapsible groups.

The name field starts with the name from the operating system. The user can
change it. In a browser the field starts empty, because the Tauri backend does
not exist there.

## Connect a service

The `/connect` step asks two questions: which service gives writing help, and
which service speaks. Each question starts with an answer that already works,
so a user on a supported Mac continues without an action.

| Job | Choices |
| --- | --- |
| Writing help | Apple Intelligence, OpenRouter, none |
| Voice | macOS system voice, ElevenLabs |

An API key goes to the macOS Keychain, through Rust. The React code sends a key
one time and reads back a status. No key enters the draft, SQLite, an event, or
the browser storage. `src/os.ts` holds the only calls to Rust.

The ElevenLabs voice list carries a public sample for each voice. The preview
button plays that sample, so it needs no key and no speech call.

Buttons, inputs, and labels come from shadcn/ui. The primitives are in
`src/components/ui/`. To add one more:

```sh
pnpm dlx shadcn@latest add <name>
```

## Run the app

Install Node.js 20 or later, pnpm, Rust, and the Tauri system dependencies.
Then run:

```sh
pnpm install
pnpm tauri:dev
```

The UI dev server uses `http://localhost:3010`. The main desktop window opens at
1376×1032, the project's 13-inch iPad landscape baseline.

Local text generation requires these items:

- An Apple Silicon Mac
- macOS 26 or later
- Apple Intelligence enabled

`pnpm tauri:dev` downloads the pinned apfel v1.9.1 binary on the first run.
The command makes sure that both archive and binary checksums match.
`pnpm tauri:build` does the same work before it builds the app bundle.

Run this command to prepare the binary without starting Tauri:

```sh
pnpm apfel:prepare
```

On unsupported systems, September starts without the sidecar. The Rust status
command reports that the local provider is unsupported.

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

The Rust backend stores settings, spaces, messages, and notes in SQLite. See
[`src-tauri/README.md`](src-tauri/README.md) for its storage and RPC contracts.
