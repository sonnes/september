# September Desktop

The desktop app is an independent Tauri v2 application with its own React and
Vite UI. Do not import UI code from `apps/web`; port screens deliberately.

## Build

Use `pnpm` from `apps/desktop/` or with `pnpm -C apps/desktop <script>`.

| Command               | Purpose                         |
| --------------------- | ------------------------------- |
| `pnpm install`        | Install desktop UI dependencies |
| `pnpm dev`            | Run the UI in a browser         |
| `pnpm build`          | Type-check and build the UI     |
| `pnpm test`           | Run bootstrap tests             |
| `pnpm tauri:dev`      | Run the desktop application     |
| `pnpm tauri:build`    | Build an installable bundle     |

Run Rust checks from `apps/desktop/src-tauri/`:

```sh
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
```

## UI boundary

- Keep all desktop UI code inside `apps/desktop/src/`. UI code goes in one of
  three directories, and a rules module stays at the root of `src/`:
  - `src/layouts/` holds a component that renders an `<Outlet/>`. There are
    three: `onboarding.tsx`, `app.tsx`, and `settings.tsx`.
  - `src/pages/` holds a component that a `createRoute` call in `src/main.tsx`
    names. One file for each group of addresses.
  - `src/blocks/` holds a part that two or more pages or layouts use. With one
    consumer, the part stays in the page that draws it.
  - `src/services/` holds a module that speaks to Rust, to the platform, or to
    a cloud service, and the React hooks over it.
  - `src/rules/` holds a module with no renderer and no backend: a node test
    imports it directly. In `src/rules/`, import a sibling with a relative
    path. Node does not resolve `@/`.
  - `src/autocomplete/` does not move. It is a copy of the web engine, and the
    two apps must stay the same.
- Build forms and controls from the shadcn primitives in
  `src/components/ui/`. Add more with `pnpm dlx shadcn@latest add <name>`.
  Import them through the `@/` alias, which points at `src/`.
- Style the rest with Tailwind utility classes. `src/styles.css` holds the
  Tailwind import, the font tokens, and the shadcn colour tokens. The tokens
  are light-mode only and use the same values as `apps/web`.
- The app has two shells. `src/layouts/onboarding.tsx` holds the setup shell:
  a left indigo sidebar with the brand, the setup title, and the step list.
  `src/layouts/app.tsx` holds the app shell: the shadcn `Sidebar` and
  `SidebarInset` pair. Show all sections. Do not add collapsible groups.
- Keep the sidebar destinations in `src/rules/app-nav.ts`, where a test can read
  them. Give each path an icon in `src/layouts/app.tsx`. The icon record is
  typed by path, so a missing icon fails the build.
- Call the Rust backend from a service module: `src/services/os.ts` for settings and
  the system, `src/services/data.ts` for the rows, `src/services/ai.ts` for the writing service.
  Do not call `invoke` from a component or from `src/services/speech.ts`.
- Change a space with `space_patch`, never with a whole row. Three writers
  change a space and each one knows only its own fields, so a whole-row write
  lets the last writer undo the others.
- Read the sound outputs from `src-tauri/src/audio.rs`. The browser cannot do
  this job: WKWebView lists no output device until the user grants the
  microphone, and September must not ask for one to name a speaker.
- Keep the virtual microphone control in the Talk audio selector beside Speak.
  The selector must remain visible when the Mac has one sound output.
- Keep the virtual camera control in the same Talk audio selector. Pass the
  current Talk composer text to it, not the text from Notes.
- Keep camera frames inside the Core Media I/O extension. Tauri sends the text
  property; Rust and the WebView must never relay video buffers.
- Write through `Composer` in `src/blocks/space.tsx` in every mode, including
  `/spaces/new`. A second console would leave one mode without the word tiles,
  the codes, or undo, which a user who cannot type depends on. `composerAction`
  in `src/rules/spaces.ts` holds what each mode says, so a test reads the words
  without a renderer.
- Say a control is unavailable with `aria-disabled`, never with `disabled`, in
  the console and on anything a user waits on. A disabled element cannot hold
  focus, so the browser moves focus to the body and a switch user loses their
  place in the scan. Guard the handler instead.
- Put every title through `freeTitle` in `src/rules/spaces.ts` before writing
  it — the made-up name, the model's, and the user's. Two spaces with one title
  share one address, and SQLite has no unique constraint to catch it.
- Put the Talk and Notes switch in the dock, never in the header. The web app
  puts it there, so a user who knows one app knows the other.
- Pick one row of many with `PickList` in `src/blocks/pick-list.tsx`. Do not
  use a dropdown: it opens on a press and closes when a dwell moves away.
- Put a panel that needs a card of its own through `RightPanel` in
  `src/blocks/screen.tsx`. A panel drawn inside a screen shares the card of
  the inset. `src/layouts/app.tsx` gives it the slot it draws into.
- Keep the right rail of a space in `src/blocks/space-panel.tsx`, and its tabs
  and saved state in `src/rules/panel.ts`, where a test can read them. Add a
  tab as a row of `PANEL_TABS` and a card beside `Phrases`, never as a second
  rail.
- Keep the model and the sliders in the card of the rail, in
  `src/blocks/speech-settings.tsx`. Both are heard in the next sentence, and a
  user who must leave the space to mend them loses the words they were writing.
- Keep the service and the list of voices on `/voice`, never in the card. A
  service is chosen once, and an account holds a hundred voices, each one to be
  heard before it is taken. `/voice` keeps the cloning too.
- Keep the rules of a note in `src/rules/notes.ts`, and the screen in
  `src/pages/notes.tsx`.
- Save a note without a Save button. A user who types slowly must never lose
  words to a button they did not press.
- Read a note aloud through `markdownToVoiceText`. A voice says `Monday`, not
  `# Monday`. A voice-over writes no message.
- Keep the rules of a space in `src/rules/spaces.ts`, where a test can read them
  without a renderer: the slug, the search, the new title, the relative time,
  the transcript page, and the composer helpers.
- Send every command through `call()` in `src/services/data.ts`. A Tauri command
  rejects with a string, so a screen that reads `error.message` shows nothing
  without it.
- Ask before an action that erases rows. Use the shadcn `AlertDialog`, and give
  the confirming button the `destructive` variant.
- Give each row the owner from `currentUserId()` in `src/services/os.ts`. Do not read
  the operating system again after setup.
- Offer words through `useSuggestions()` in `src/services/suggest.ts`. Keep the rules in
  `src/autocomplete/index.ts`, where a test can read them without a renderer.
  `src/autocomplete/` is a copy of the engine in the web app: change a file
  there only to keep the two apps the same.
- Speak through `speak()` in `src/services/speech.ts`. Every voice meets the
  `SpeechProvider` interface, so a screen never names a service. Spoken
  messages use the native playback commands, where the process tap receives
  them. Use `src/services/player.ts` only for voice-list previews.
- A cloud voice that fails must fall back to the voice of the operating
  system. Silence is the worst answer for a user who cannot speak.
- Give each control of a phrase row a 44px target, through `RowButton` in
  `src/blocks/phrase-panel.tsx`. The web app uses 36px there. `DESIGN.md` wins: a user
  of September points with less accuracy than a user of a browser.
- Keep the rules of a phrase, a code, and a shortcut idea in `src/rules/phrases.ts`,
  and the rules of a stripe in `src/rules/stripes.ts`. Both are ports of the web app.
  Change them in both apps, or in neither.
- A model never writes over a phrase that the user kept. Write new rows with
  `phrase_replace_ai`, which erases only the rows with `pinned = 0`.
- Add a word from the engine with `applySuggestion` in `src/services/suggest.ts`. The
  screen must not cut the text at the caret itself, because only the engine
  knows a part-written word from a finished one.
- Give each row of the composer its own colour. A word is amber, a past
  message is teal, and a phrase is indigo. A user must see what a press does
  before pressing.
- Make the code of a phrase with `generateCode`. A model must never choose one,
  because only the generator knows the words a user would type.
- Name a voice file in `src-tauri/src/speech.rs`, from the hash of the speech
  settings and the normalized words. Do not name one anywhere else, and do not
  keep a path to it on a message.
- Give a Rust type that crosses to the WebView the names that the screen reads.
  A field that comes from a service with another name uses
  `#[serde(rename(deserialize = "..."))]`, which works on the way in only. A
  type that the WebView sends uses `#[serde(rename_all = "camelCase")]`. A name
  that does not match makes a field `undefined`, and TypeScript cannot see it.
- Keep every API key in the macOS Keychain, through `src-tauri/src/providers.rs`.
  A key must not enter the onboarding draft, SQLite, a Tauri event, a log, or
  the browser storage. A command returns a status, never a key.
- Use a brand mark only from the file that the brand publishes, kept in
  `public/`. Do not redraw one. The September mark is `public/logo.svg`, shown
  through `BrandMark` in `src/blocks/brand.tsx`. The Apple logo is the U+F8FF glyph from the
  macOS system font, which `system-ui` supplies. Apple asks for a written
  trademark licence before a third party shows this mark.
- Keep the rule for the first route in `openingPath`, in `src/rules/app-nav.ts`. It
  is an allowlist of app paths. A saved address that names no screen must not
  decide where the app opens.
- Add a screen as a route in `src/main.tsx`. Keep the step rules in
  `src/rules/onboarding.ts`, where a test can read them.
- Keep the settings sections in `src/rules/settings-nav.ts`, where a test can read
  them, the section list in `src/layouts/settings.tsx`, and the screens in
  `src/pages/settings.tsx`. Give each path an icon in `src/layouts/settings.tsx`.
  The icon record is typed by path.
- Keep the parts that setup and settings share in `src/blocks/services.tsx`: the mode
  card, the mark, the state pill, and the key panel. Do not write a second one.
- Write a setting from a screen through `updateSetup()` in `src/services/os.ts`. It
  holds the new answers, so `currentSetup()` gives them at once.
- Open an address with `openInBrowser()` in `src/services/os.ts`. A Tauri window blocks
  a plain link.
- Read the saved setup through `currentSetup()` in `src/services/os.ts`, never through
  `invoke` in a route. The module holds the value it wrote, so a guard right
  after setup sees the new answers.
- Follow the root `DESIGN.md` for every screen.
- Keep the 1376×1032 baseline usable before adapting a screen to other sizes.
- Write a failing test before each implementation change.
