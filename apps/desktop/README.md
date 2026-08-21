# September Desktop

September Desktop is an independent Tauri application, sized for the 13-inch
iPad landscape window. It has a setup flow and the app layout that the flow
opens into. The Rust backend also provides local text generation through a
bundled apfel sidecar on supported Macs.

The UI uses Tailwind CSS v4, shadcn/ui primitives, and TanStack Router.

## Move through the app

The root route holds an outlet only. Below it are two layouts, so a setup step
never wears the app sidebar, and an app screen never wears the setup sidebar.

| Layout      | Component                     | Routes                                             |
| ----------- | ----------------------------- | -------------------------------------------------- |
| Setup       | `OnboardingLayout`, `app.tsx` | `/welcome` `/profile` `/mode` `/connect` `/finish`  |
| Application | `AppShell`, `shell.tsx`       | `/dashboard` `/spaces` `/spaces/$slug/talk` `/voice` `/help` `/settings` |

`AppShell` is the shadcn `Sidebar` and `SidebarInset` pair: a solid indigo
sidebar beside a white inset card. `src/app-nav.ts` lists the destinations and
their descriptions. `src/shell.tsx` gives each path an icon. A destination
without a ported screen shows a short placeholder, so the route and the
sidebar item are real before the screen is.

The window opens at the 1376px baseline, so the sidebar starts as a 48px icon
rail. A wider screen opens the full sidebar. Command-B toggles it, and that
choice holds until the width crosses the baseline again.

Setup runs one time. The last step keeps its answers in the `setup` setting,
then opens `/dashboard`. After that, `/` opens `/dashboard` directly, and the
setup flow does not show again.

`isSetupDone` in `src/onboarding.ts` owns that rule: setup is done when it
holds a name and a mode. The app layout reads the same rule, so an app screen
opened before setup turns back to `/welcome`.

To run setup again, erase the `setup` setting.

## Talk in a space

A space keeps the words that the user says to one person or in one place.
`/spaces` lists them. `/spaces/$slug/talk` opens one.

The list shows the spaces, most recently used first. Each row gives the title
and the time of the last message. A search field keeps the rows whose title
holds the words that the user types.

The first space is `General`. A later space is `New space`, then `New space 2`,
and so on. The name must be free, because one slug must name one space. A new
space opens at once, and the user can give it a better name in the header.

Delete asks first. Deleting a space deletes its messages too, so a dialog with
a red button holds the action.

The slug is the title of the space, and it holds no identifier. A stale slug
goes back to the list. A new title moves the address with it. Two spaces cannot
share a title, because one slug must name one space.

The Talk screen has three parts, from the top:

1. The transcript. It holds the spoken messages, 8 for each page, newest last.
   Press a message to speak it again.
2. The composer. It has the text field, undo, delete last word, clear, and
   Speak. The Enter key speaks. Shift and Enter make a new line.
3. The dock. It has one tab for each space, and a button that makes a new one.

`src/spaces.ts` owns the rules that a test can read: the slug, the page, the
unique title, and the word that delete removes.

`src/data.ts` holds every read and every write of a space or a message. It uses
TanStack Query over the Rust commands. The owner of each row is the login name
of the operating system, which setup keeps in the `setup` setting.

The composer keeps its text until SQLite accepts the message, so a failed write
loses no words.

## Hear a voice

`src/speech.ts` gives every voice one interface. A screen calls `speak(text)`
and does not know which service answers.

| Voice        | How it speaks                                              |
| ------------ | ---------------------------------------------------------- |
| `system`     | The Web Speech API of the WebView. No file, no key.        |
| `elevenlabs` | Rust makes a file. `src/player.ts` plays it.               |

A cloud voice that fails falls back to the voice of this Mac, and the composer
says so. A person who cannot speak must not meet silence.

A voice file is named for what makes its sound:

```
audio/<sha256 of the settings and the words>.mp3
```

The words lose the spaces at their ends, and each run of spaces becomes one
space. Case and punctuation stay, because both change how a voice reads a
sentence. The three numbers are written with three decimal places, so `0.5`
and `0.50` give one name.

The same words in the same voice therefore go to the service one time. A
changed voice, a changed number, or a changed word makes a new file. No rule
erases the old files yet.

A message keeps no path to a file. The name is the index, so a message spoken
with an old voice plays with the voice of today.

The `/voice` screen holds the choices: the service, the voice, and three
sliders for speed, steadiness, and likeness. Each change is kept at once, in
the `speech` setting. **Try it** speaks one short sentence, so the user hears a
change before a real message. A voice sample plays from a public address, so it
needs no key.

## Walk through setup

Each step is a route: `/welcome`, `/profile`, `/mode`, `/connect`, and
`/finish`.
Free setup skips `/connect`, so it shows four steps and advanced setup shows
five. `stepsFor` in `src/onboarding.ts` owns that rule, and the sidebar, the
guards, and both navigation directions all read it. The router uses hash history,
because Tauri serves the built files from the asset protocol. A step opens only
after the answers it needs exist. The answers stay in memory until account
persistence is ported.

The brand, the setup title, and the step list are in a left indigo sidebar.
Each step opens as an inset white card beside it. All sections on a step stay
open. There are no collapsible groups.

Both sidebars show the same brand mark. `src/brand.tsx` reads it from
`public/logo.svg`, the file the brand publishes.

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

The Rust backend stores settings, spaces, messages, and notes in SQLite. It
provides list, get, put, and delete commands for each domain row. See
[`src-tauri/README.md`](src-tauri/README.md) for the complete storage and RPC
contracts.
