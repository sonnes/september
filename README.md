# September

September is an assistive communication app for people with ALS, MND, or other speech and motor difficulties. It helps a user express a full thought with fewer keystrokes.

![The Talk screen of a space named Family. Six spoken messages sit above a row of
pinned phrases and suggested words, and a composer with a Speak
button.](docs/screenshots/talk.png)

The screenshots on this page show the browser app with sample data.

## Applications

September contains three applications:

- `apps/web` is the browser application.
- `apps/desktop` is the Tauri application for macOS.
- `apps/swift` is the native floating keyboard for macOS.

The web and desktop applications import the same rules, autocomplete engine,
design system, and application screens from the root workspace packages. Each
app keeps its own route bootstrap and platform services. The web app also has a
public landing page at `/`.

The web app stores data and its bounded speech cache in one IndexedDB database. The desktop app stores domain data in SQLite and provider keys in the macOS Keychain.

## Features

- Talk spaces combine saved phrases, word suggestions, and a text composer.
- System and ElevenLabs voices speak Talk messages and notes.
- Notes store prepared long-form text inside a space.
- A note presents full-screen in the user's voice, and exports as text, audio, or a captioned video.
- Phrase codes expand short input into a full phrase.
- Local usage reports show saved keystrokes and provider use.
- ElevenLabs can create a cloned voice from browser or desktop recordings.

## Screens

A note holds prepared long-form text inside a space. The same words read aloud,
present, or export.

![A note named Thursday appointment, open in the note editor. Read aloud,
Present, and Export buttons sit at the top, and the other notes of the space sit
in a row under the text.](docs/screenshots/note.png)

Present fills the screen with one chunk of the note at a time and speaks it in
the user's voice.

![A presented note on a full indigo screen. One sentence reads, in large white
type, "Seventy years, and she still gets to the kitchen before anyone else is
awake."](docs/screenshots/present.png)

Today reports the typing the app saved and what the services cost. The numbers
stay on the device.

![The Today screen. Efficiency reads 66 percent less typing this week, beside
508 keystrokes saved and 12 messages spoken. Service use reads 6 cents across 16
requests.](docs/screenshots/today.png)

## Requirements

- Node.js 20 or later
- pnpm
- Rust and the Tauri system requirements for desktop builds
- Swift 6 and Xcode command-line tools for the native keyboard

## Install

Install the JavaScript workspace from the repository root:

```sh
pnpm install
```

The web app does not use environment variables for provider keys. Add OpenRouter or ElevenLabs keys in the application settings.

## Develop

Start the browser application:

```sh
make dev
```

The application opens at `http://localhost:3009`.

Start the desktop application:

```sh
make desktop-dev
```

Start the native keyboard:

```sh
make mac-run
```

## Project structure

```text
september/
├── apps/
│   ├── web/            Vite browser SPA and native IndexedDB repository
│   ├── desktop/        Vite UI, Tauri shell, Rust commands, and SQLite
│   ├── server/         Cloudflare Worker for the browser SPA
│   └── swift/          Native macOS floating keyboard
├── packages/
│   ├── core/           Pure rules and autocomplete
│   ├── ui/             Shared tokens and generic UI primitives
│   └── app-ui/         Shared layouts, blocks, and application screens
└── docs/               concepts, plans, research, notes, and screenshots
```

Read the instruction file in an application directory before you change that
application. JavaScript dependencies use the root lockfile. Commands can still
run from an app directory.

## Web data migration

The browser app imports the old web databases one time. It validates the imported rows before it removes the old databases and local-storage keys.

If another tab blocks database removal, close the old tab and start September again. The next start retries removal without another import.

## Tests

Run the checks from the application directory:

```sh
pnpm -C apps/web test
pnpm -C apps/web lint
pnpm -C apps/web build

pnpm -C apps/desktop test
pnpm -C apps/desktop build

make mac-test
```

## License

September uses the MIT License. See `LICENSE`.
