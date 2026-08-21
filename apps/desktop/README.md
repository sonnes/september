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
| Application | `AppShell`, `shell.tsx`       | `/dashboard` `/spaces` `/spaces/$slug/talk` `/voice` `/help` `/settings` `/settings/writing` `/settings/connections/$provider` |

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

The first message replaces that made-up name. A model reads the message and
writes a name and a note for the space. The note says who the user is talking
to and why, and the model that offers phrases and sentences reads it, so a
named space gives better words than an empty one. A name the user typed is
never replaced, and neither is a note the user wrote. A user with no writing
service keeps the made-up name.

Delete asks first. Deleting a space deletes its messages too, so a dialog with
a red button holds the action.

The slug is the title of the space, and it holds no identifier. A stale slug
goes back to the list. A new title moves the address with it. Two spaces cannot
share a title, because one slug must name one space.

The Talk screen has three parts, from the top:

1. The transcript. It holds the spoken messages, 8 for each page, newest last.
   Press a message to speak it again.
2. The composer. It has the text field, undo, delete last word, clear, the
   audio selector, and Speak. The Enter key speaks. Shift and Enter make a new
   line.
3. The dock. It has one tab for each space, and a button that makes a new one.

`src/spaces.ts` owns the rules that a test can read: the slug, the page, the
unique title, and the word that delete removes.

`src/data.ts` holds every read and every write of a space or a message. It uses
TanStack Query over the Rust commands. The owner of each row is the login name
of the operating system, which setup keeps in the `setup` setting.

The composer keeps its text until SQLite accepts the message, so a failed write
loses no words.

Three writers change a space, and each one knows only its own fields: the user
renames it, a model writes the name and the note, and the phrase sync counts
the messages. Each writer holds a copy of the row from the moment it started,
so a whole-row write puts back the fields it never meant to touch. `space_patch`
changes only the fields it is given, in one statement.

### Where the sound comes out

The audio selector beside Speak lists every output of this Mac. It moves both
voices to the output the user chooses. The Mac remembers the choice, and
September keeps no copy that could disagree.

The selector also controls `September Microphone` for calling apps. It remains
visible on a Mac with one output so the microphone control stays available.

`src-tauri/src/audio.rs` reads the outputs from CoreAudio. The browser cannot
do this job: WKWebView holds `setSinkId`, but `navigator.mediaDevices` lists no
output device until the user grants the microphone, and September must not ask
for a microphone to name a speaker.

## Offer the next word

A person with ALS types slowly. Each word that the app offers is a word that
the user does not type. This is the first measure of the app.

`src/autocomplete/` holds the engine. It is a copy of the engine in the web
app, so a correction in one app can move to the other one. It reads no file
and calls no service.

The engine blends three models of the words that come next:

| Layer | Weight | What it learns                                     |
| ----- | ------ | -------------------------------------------------- |
| base  | 1.0    | The seed words in `src/autocomplete/corpus.ts`.    |
| user  | 2.0    | Every message that the user sends, in every space. |
| space | 3.0    | The messages of the space that is open.            |

The weight of a space starts at zero and grows over its first 500 words. A new
space with three messages must not speak over the other two layers.

`src/autocomplete/index.ts` holds the two rules that a test can read:

- `suggestionsFor(engine, text, spaceId)` gives the words to show. A space or a
  mark of punctuation at the end of the text asks for the next word. If the
  text stops in the middle of a word, it asks for the spellings of that word.
- `applySuggestion(text, word)` gives the text after the user takes a word. A
  word always ends with a space, which saves one more keystroke.

`src/suggest.ts` holds the engine and gives it the messages. A screen calls
`useSuggestions(spaceId, draft)`.

The engine learns again at each start. This costs about 10 ms for the seed
words. Keep a snapshot in SQLite only if a measurement shows that the start
became slow.

## Say more with fewer keys

Above the composer is a row of ready words for each suggestion. A press on a
word takes the sentence up to that word. This is the reason the app exists.

The rows come from four places, in this order:

1. The saved phrases of the space, and its sentence starters.
2. The past messages of the space that begin with the words already typed.
3. The writing service, when the user chose one.
4. A short code at the caret, which goes above them all.

`src/stripes.ts` and `src/phrases.ts` hold the rules. Both are ports of
`apps/web/src/packages/{suggestions,spaces}/lib`. Change them in both apps, or
in neither.

A code is a short name for a phrase: `ty` gives "Thank you". Type it and the
phrase comes to the top of the rows. A code is 2 to 5 letters, it is never a
word the user might type, and it is never the same as another code. The app
makes a code with `generateCode`. A model never chooses one.

A phrase is pinned or not:

| Pinned | Where it comes from            | What happens to it              |
| ------ | ------------------------------ | ------------------------------- |
| Yes    | The user kept it               | It stays. Nothing replaces it.  |
| No     | A model wrote it               | The next writing replaces it.   |

A model writes the phrases when a space holds its first message, and again
after six more. `phrase_replace_ai` erases only the rows that are not pinned,
in one transaction, so a phrase the user relies on cannot be lost. The first
space starts with three pinned phrases, so the rows are never empty.

The header of the Talk screen opens the Phrases panel. It lists the phrases of
the space, and it takes a code for each one. Below them are shortcut ideas:
words the user typed five or more times, with a code ready. `mineShortcuts`
counts them locally, with no model, so they work in privacy mode. An idea the
user turns down is kept in a setting and never comes back.

Nearest the composer is the word row. It offers the next word, or the endings
of the word that the user started. The engine in `src/autocomplete/` learns
from the messages of the user, so it needs no service and no wait.
`applySuggestion` knows a part-written word from a finished one, so the screen
never splits the text itself.

Each row reads differently. The colour and the mark in the gutter say the same
thing, so a user who does not read colour still knows what a row is:

| Row              | Colour and line | Mark          | The key at the end |
| ---------------- | --------------- | ------------- | ------------------ |
| A code           | Strong indigo   | The code      | Speak, solid       |
| A phrase         | Indigo          | A pin         | Speak              |
| An opening       | Indigo, broken  | Two arrows    | Take the opening   |
| A past message   | Teal            | A clock       | Speak              |
| From a model     | Grey            | none          | Speak              |
| A word           | Warm            | none          | none               |

The sizes come from `TILE` in `src/stripes.ts`, the same numbers the web app
uses. `tileScale` makes every tile smaller together, so the widest row stays on
one line. It counts the letters, the padding of each tile, and the line around
it, against the width that a `ResizeObserver` reports. The web app measures
each word with a layout engine instead. A row that is still too wide scrolls,
so no tile is ever out of reach.

A hover marks the tiles that a press would take, from the start of the row to
the tile under the pointer.

A user with no writing service still gets the phrases, the starters, the
codes, the rows from past messages, and the word row.

## Hear a voice

`src/speech.ts` gives every voice one interface. A screen calls `speak(text)`
and does not know which service answers.

| Voice        | How it speaks                                                |
| ------------ | ------------------------------------------------------------ |
| `system`     | The native process uses the macOS system voice. No file, no key. |
| `elevenlabs` | Rust makes a file. The native process plays the cached file.  |

Spoken messages now leave the native process. This path lets the Core Audio
process tap receive both voices. Voice-list previews still use `src/player.ts`
and do not enter a call.

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

### Use the voice in FaceTime

The Talk audio selector can publish `September Microphone` as a macOS audio
input. The input exists only while September runs and the control is on.

1. Open Talk and open the audio selector beside **Speak**.
2. Turn on **September Microphone**.
3. Allow system audio capture when macOS asks.
4. Open FaceTime and select **September Microphone** from the Video menu.
5. Speak a message in September.
6. Turn off **September Microphone** when the call ends.

September removes the input when it quits. The next start also removes a stale
input that remained after an unexpected exit. This feature requires macOS 26
or later and does not install an audio driver.

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

## Change a setting

`/settings` holds the answers that setup collected. It is a layout with a
section list beside the open section, ported from the web app.

| Section | Route | Holds |
| --- | --- | --- |
| Setup | `/settings` | The mode cards, and the state of each service |
| Writing help | `/settings/writing` | Who writes, and what the model knows about you |

The web app has three more sections. Listening needs a transcription backend,
Usage needs a spend count, and Account needs an account. The desktop app has
none of the three. Voice keeps its own screen, `/voice`, in both apps.

`src/settings-nav.ts` holds the rules that a test can read: the sections, the
open section, and the guide for each cloud service. `src/settings.tsx` holds
the screens.

A press on **Set up** opens `/settings/connections/openrouter` or
`/settings/connections/elevenlabs`. The page gives the steps, takes the key,
and opens the address of the service in the browser of the Mac. The key goes
straight to the Keychain, through `src/os.ts`.

`src/services.tsx` holds the parts that setup and settings share: the mode
card, the mark of each service, the state pill, and the key panel. A brand
asset is therefore named one time.

Every change is kept at once, as `/voice` does. There is no Save button to
forget. A text field waits half a second after the last keystroke, so one
sentence is one write.

A mode change re-points the services. Free mode takes the writer and the voice
of this Mac. Advanced keeps every answer. Neither one erases a key.

The speaking style and the personal words go to the writing service as its
user context. `userContext()` in `src/ai.ts` assembles them.

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
