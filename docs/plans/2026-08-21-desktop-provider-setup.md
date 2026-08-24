---
title: Desktop provider setup
description: Add a Connect step that asks two questions, and keep every API key in the macOS Keychain.
---

# Desktop provider setup

Mock: [2026-08-21-provider-setup-options.html](../mocks/2026-08-21-provider-setup-options.html), Option A.
Depends on: [2026-08-21-integrate-apfel-desktop.md](2026-08-21-integrate-apfel-desktop.md).

## Goal

Onboarding asks two questions: which service gives writing help, and which
service speaks. Each question starts with a correct answer, so a user can
continue without an action. An API key goes to the macOS Keychain and never
returns to the WebView.

## Assumptions

- The apfel work lands first. This plan calls `apfel_status` and adds no new Apple Intelligence code.
- The three services do two jobs. Apple Intelligence and OpenRouter give writing help. ElevenLabs and the macOS system voice speak.
- The system voice is always available, so a broken key never stops speech.
- The Connect step appears only after the user chooses "Use your own services".
- Key storage is separate from the onboarding draft. The draft stays in memory, as it is today.

## Design

### The two questions

| Question | Choices | Default |
| --- | --- | --- |
| Writing help | Apple Intelligence, OpenRouter, None | Apple Intelligence when it is available, else None |
| Voice | System voice, ElevenLabs | System voice |

### Apple Intelligence needs no new backend

`apfel_status` already returns the three states the step must show.

| `supported` | `available` | Step shows |
| --- | --- | --- |
| `false` | `false` | Hide the choice. The Mac cannot run it. |
| `true` | `false` | "Turn on Apple Intelligence", with the `reason` text |
| `true` | `true` | "Ready", and the choice is selected |

### Where each value lives

| Value | Home | Reason |
| --- | --- | --- |
| OpenRouter key, ElevenLabs key | macOS Keychain | A secret must not enter SQLite, the draft, or a log |
| Writing service, voice service, voice id | SQLite settings, through `setting_put` | The Keychain survives a reload, so the choice must survive too |
| Key status, account label, quota | Memory only | Rust computes it from the Keychain and the network |

The React code never holds a key. It sends a key to Rust one time, and it
reads back a status.

### New Tauri commands

| Command | Input | Output |
| --- | --- | --- |
| `provider_status` | none | One status for each of the two cloud services |
| `provider_connect` | provider, key | The status after the test, or an error message |
| `provider_forget` | provider | `true` when a key was removed |
| `provider_voices` | none | The ElevenLabs voices, with a name and a preview URL |

`provider_connect` tests the key before it writes to the Keychain. A key that
fails is not stored.

### Key tests

| Service | Request | Success means |
| --- | --- | --- |
| OpenRouter | `GET /api/v1/key`, bearer token | The account label, and whether it is free tier |
| ElevenLabs | `GET /v1/user/subscription`, `xi-api-key` header | The characters that are left this month |

Read the exact field names from one live response in step 4. Do not guess them
in the client type.

### Voice preview

Each ElevenLabs voice carries a `preview_url` to a public audio file. The
Preview button plays that URL with the `Audio` constructor. This needs no key,
no text-to-speech call, and no audio code in Rust. The content security policy
in `tauri.conf.json` must permit that media host.

## Implementation

### 1. Flow rules, in TypeScript only

1. Write failing tests in `tests/bootstrap.test.mjs` for the branch.
2. Add `/connect` to `STEPS`, between `/mode` and `/finish`.
3. Add `stepsFor(draft)`. It removes `/connect` when the mode is not `"advanced"`.
4. Change `stepIndex`, `nextStep`, and `previousStep` to read `stepsFor(draft)`.
5. Add `writingService` and `voiceService` to `OnboardingDraft`.
6. Update `canReach` so `/finish` opens after the Connect step, or straight from free mode.

The sidebar reads `stepsFor(draft)`, so free mode shows four steps and
advanced mode shows five.

### 2. Keychain, in Rust

1. Write a failing test for the Keychain entry name of each provider.
2. Add `keyring = { version = "3", features = ["apple-native"] }` to `Cargo.toml`.
3. Add `src-tauri/src/keys.rs` with a `Provider` enum and read, write, and remove functions.
4. Use one service name for the app, and the provider name as the account.

### 3. Cloud clients and commands, in Rust

Write every test first, then build the client and the command together. The
command is a thin wrapper, so a separate step for it adds no value.

1. Write failing integration tests in `src-tauri/tests/providers.rs`. Copy the stub server from `tests/apfel.rs`.
2. Cover four cases for each service: the key works, the key is rejected, the quota is empty, and the network fails.
3. Write a failing test that `lib.rs` registers the four commands.
4. Add the `rustls` feature to `reqwest`. The current build has no TLS, because apfel uses plain loopback HTTP.
5. Add `src-tauri/src/providers.rs` with a client for each service. Each client takes a base URL, so a test can point it at loopback.
6. Add the commands to `rpc.rs`, in the style of `setting_get`.
7. Return a status struct that holds no key.
8. Add no capability entry. `core:default` already covers a command that the app defines.

### 4. The Connect step

1. Write failing source tests: the step holds no `invoke` call, and the draft holds no key.
2. Add the shadcn `radio-group` and `select` primitives.
3. Add `ConnectStep` to `steps.tsx`. Reuse the `Field` component from the profile step.
4. Put the key field inside the choice card, and show it only when that choice is selected.
5. Add the new commands to `src/os.ts`. No component calls `invoke`.
6. Read one live response from each service, and correct the client types.

### 5. Copy and documentation

1. Correct the free-mode text in `SETUP_MODES`. On a Mac with Apple Intelligence, free mode is the private choice, and no message leaves the device.
2. Read `apfel_status` on the mode step, so the free-mode text matches the Mac.
3. Update `apps/desktop/README.md`, `apps/desktop/src-tauri/README.md`, and `apps/desktop/AGENTS.md`.
4. Add a concept document at `docs/concepts/desktop-providers.md`.
5. Add a row to `DESIGN.md` for the Connect step.
6. Keep notes in `docs/notes/2026-08-21-desktop-provider-setup.md`.

## Completion criteria

- Free mode goes from "Choose setup" to "Finish", and the sidebar shows four steps.
- Advanced mode shows the Connect step, and the sidebar shows five steps.
- A user with a supported Mac continues from the Connect step with no action.
- A key that fails the test is not written to the Keychain, and the step says so.
- `provider_status` returns a label and a quota, and never a key.
- A search of `src/` finds no API key in the draft, in SQLite, or in an event.
- The voice preview plays without a key.
- Apple Intelligence disappears from the choices on a Mac that cannot run it.
- Desktop tests, `pnpm build`, `cargo test`, Clippy, and `cargo fmt` all pass.

## Out of scope

- Persisting the whole onboarding draft. Only the service choices and the voice id go to settings.
- A Settings screen. The mock shows Option B for that, and it is separate work.
- Text-to-speech through ElevenLabs. This plan connects the key and picks a voice.
- Any fourth service.
