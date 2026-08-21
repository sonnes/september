---
title: Desktop settings
description: How to port the settings screens and their flow from the web app into the independent desktop app.
status: plan, not approved
---

# Desktop settings

## Context

`/settings` in the desktop app is a placeholder. `AppScreen` in
`src/shell.tsx` shows the line "This screen is not ported from the web app
yet." A user who finishes setup can never change an answer again.

The web app holds five settings sections. The desktop app has an equivalent
for two of them. This plan ports those two, in the shape the web app uses: a
left sub-nav, child routes, and a drill-in page for each API key.

The result: a user changes the mode, adds or removes a key, chooses the
writing service, and edits the speaking style, without a new install.

## What ports, and what does not

| Web section | Desktop | Why |
| --- | --- | --- |
| Setup (mode, connections) | Yes | The desktop app has two modes and three services. |
| Writing help | Yes | The desktop app chooses a writing service. |
| Listening | No | The desktop app has no transcription backend. |
| Usage | No | The desktop app counts no spend. |
| Account | No | The desktop app has no account, no terms, no import file. |
| Voice | No | `/voice` already holds it, in both apps. |

Three web controls also drop. The Rust backend fixes the OpenRouter model list
in `OPEN_ROUTER_MODELS`, so the model picker has nothing to pick. The
temperature and the suggestion count come from the caller in
`src/suggestions.tsx`, not from a setting.

The web app puts the tuning controls behind a `Collapsible`. The desktop app
does not. `tests/bootstrap.test.mjs` holds the rule "every section stays
open", and `src/components/ui/` has no collapsible primitive.

## Routes

`src/main.tsx` replaces `screen("/settings")` with a small tree.

| Route | Screen | Holds |
| --- | --- | --- |
| `/settings` | `SettingsLayout` | The sub-nav beside an outlet |
| `/settings` (index) | `SetupSettings` | The mode cards and the connections |
| `/settings/writing` | `WritingSettings` | The writing service and About you |
| `/settings/connections/$provider` | `ConnectionScreen` | One guide and one key field |

`$provider` accepts `openrouter` and `elevenlabs`. Any other value redirects
to `/settings`, as the web route does.

## Modules

Three new files, beside the two that already pair a data module with a
screen (`app-nav.ts` with `shell.tsx`).

**`src/settings-nav.ts`** — the rules, in plain TypeScript, so a test reads
them without a renderer:

- `SETTINGS_NAV` — the two destinations, each with a path, a title, a
  description, and an icon key.
- `sectionFor(pathname)` — the active destination. Setup stays active on a
  connection page, as `SettingsNav` does in the web app.
- `modeUpdate(mode, connections, current)` — the setup answers that a mode
  change implies. This is the desktop equivalent of `buildFreeModeUpdate` in
  `apps/web/src/packages/onboarding`.
- `CONNECTION_GUIDES` — the lede, the numbered steps, and the address for
  OpenRouter and ElevenLabs. The addresses are the ones in
  `apps/web/src/packages/ai/lib/registry.ts`:
  `https://openrouter.ai/keys` and
  `https://elevenlabs.io/app/settings/keys`.

**`src/services.tsx`** — the service UI that setup and settings share. Move
`Mark`, `Status`, `CloudStatus`, `KeyPanel`, and `MODE_ACCENT` out of
`src/steps.tsx`, unchanged. `KeyPanel` already holds the password field, the
Connect button, the Remove key button, and the error line, over
`connectProvider` and `forgetProvider` in `src/os.ts`.

**`src/settings.tsx`** — the four screens. One file, as `src/talk.tsx` holds
both the list and the Talk screen.

## Rules of a mode change

`modeUpdate` keeps every key. A key lives in the macOS Keychain, and a mode is
not a reason to erase one.

| Next mode | Writing service | Voice service |
| --- | --- | --- |
| `free` | `apple` when the Mac can run it, `none` when it cannot | `system` |
| `advanced` | Unchanged | Unchanged |

## Changes to files that exist

| File | Change |
| --- | --- |
| `src/os.ts` | Add `updateSetup(patch)`, which merges into the saved setup. Add `openInBrowser(url)`. |
| `src/main.tsx` | The settings route tree above. |
| `src/steps.tsx` | Import the moved components from `src/services.tsx`. |
| `src/app-nav.ts` | The `/settings` description no longer says "Your name". |
| `src/suggestions.tsx` | Line 494 sends the speaking style and the personal words as `globalMd`. |
| `src-tauri/capabilities/default.json` | Add `shell:allow-open`. |
| `package.json` | Add `@tauri-apps/plugin-shell`. |
| `tests/bootstrap.test.mjs` | The test "each service wears its own mark" reads `src/services.tsx`. |

`tauri-plugin-shell` is already a Rust dependency, and `src-tauri/src/lib.rs`
already initializes it for the apfel sidecar. Only the JavaScript side and the
capability are missing. **No Rust source changes, and no migration.**

### One deliberate addition

`src/suggestions.tsx` sends `globalMd: ""` today. The speaking style and the
personal words are collected at `/profile` and never read. An editor for a
value that nothing reads is half a feature, so this plan connects them. It is
two lines. Cut this item if you want the port to stay pure.

### One known gap, not in scope

`saveServices` in `src/os.ts` writes a `services` setting that nothing reads.
The voice identifier that `/connect` chooses is lost there. `/voice` keeps its
own identifier in the `speech` setting. This is an older fault. It stays.

## Steps

Each step starts with a failing test, as `apps/desktop/CLAUDE.md` requires.
New tests go in `tests/settings.test.mjs`, beside `tests/autocomplete.test.mjs`.

1. **Move the shared service UI.** (~30 min) Create `src/services.tsx` from
   the parts of `src/steps.tsx`. Point the mark test at the new file first.
2. **Write the rules.** (~45 min) `src/settings-nav.ts`, with tests for the
   nav list, `sectionFor`, `modeUpdate`, and the guides.
3. **Add the two backend bridges.** (~20 min) `updateSetup` and
   `openInBrowser` in `src/os.ts`, with the capability and the package.
4. **Build the layout and the Setup page.** (~1.5 h) The sub-nav beside the
   outlet. The mode cards over `SETUP_MODES`. The connections list, one row
   for each of Apple Intelligence, OpenRouter, and ElevenLabs, over
   `readConnections()`.
5. **Build the connection page.** (~45 min) The guide, then `KeyPanel`, then
   the address button.
6. **Build the Writing help page.** (~1 h) The service choice over
   `WRITING_SERVICES`, then About you: the speaking style and the personal
   words. Each change saves at once, as `/voice` does. Text fields wait 500 ms.
7. **Open the routes.** (~15 min) `src/main.tsx` and `src/app-nav.ts`.
8. **Update the documents.** (~30 min) `apps/desktop/README.md`,
   `CLAUDE.md`, `AGENTS.md`, and a note in
   `docs/notes/2026-08-21-desktop-settings.md`.

About 5.5 hours in total.

## Tests

New tests in `tests/settings.test.mjs`:

1. Each settings destination has a route in `src/main.tsx`.
2. Setup stays the active section on a connection page.
3. A change to free mode re-points the services and keeps the keys.
4. Each cloud service has a lede, steps, and an address.
5. `src/settings.tsx` holds no `@tauri-apps/api` import, so no screen can hold
   a key.
6. `src/settings.tsx` and `src/steps.tsx` both import from
   `src/services.tsx`, so one key panel serves both.
7. `src/settings.tsx` has no `aria-expanded`, so every section stays open.
8. The capability grants `shell:allow-open`, and `src/os.ts` is the only
   caller.

## Verification

Run from `apps/desktop`:

```sh
pnpm test
pnpm build
```

Then run the application and walk the flow:

```sh
pnpm tauri:dev
```

1. Open Settings from the sidebar. Make sure that the sub-nav shows two
   sections.
2. Change the mode from Advanced to Free. Make sure that the writing service
   moves to Apple Intelligence, or to none on an older Mac.
3. Open the OpenRouter row. Paste a key. Make sure that the row reads
   "Connected".
4. Press the address button. Make sure that the browser opens.
5. Remove the key. Make sure that the row reads "Needs a key" again.
6. Open Writing help. Change the speaking style. Reload the window with
   Command-R. Make sure that the new style is still there.
7. Open a space and type. Make sure that the suggestions still appear.

No Rust source changes, so the `cargo` checks are unaffected.
