# September Desktop

The desktop app is a Tauri v2 application with its own React/Vite bootstrap and
platform services. It renders the shared workspace UI; never import source from
`apps/web`.

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

- `packages/app-ui/` owns layouts, blocks, and application screens. Desktop
  routes in `src/main.tsx` import them through `@september/app-ui`.
- `packages/ui/` owns shadcn primitives and `theme.css`. `src/styles.css` is a
  small Tailwind entry point that imports that theme.
- `packages/core/` owns autocomplete and platform-independent rules. Local
  rule files are compatibility exports; `app-nav`, `settings-nav`, and
  `onboarding` stay local because they define the platform route contract.
- `src/services/` owns Tauri, platform, cloud, and React Query adapters. Shared
  UI imports them through `@platform/*`, which maps to `src/`.
- Do not add a desktop copy of a shared screen, primitive, token, or pure rule.
  Add or change the canonical workspace package instead.
- The app has two shells. `packages/app-ui/layouts/onboarding.tsx` holds the setup shell:
  a left indigo sidebar with the brand, the setup title, and the step list.
  `packages/app-ui/layouts/app.tsx` holds the app shell: the shadcn `Sidebar` and
  `SidebarInset` pair. Show all sections. Do not add collapsible groups.
- Keep the sidebar destinations in `src/rules/app-nav.ts`, where a test can read
  them. Give each path an icon in `packages/app-ui/layouts/app.tsx`. The icon record is
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
- Route speech through September's native audio engine. Never change the macOS
  default output when the user chooses a speaker in September.
- Keep the virtual microphone control in the Talk audio selector beside Speak.
  The selector must remain visible when the Mac has one sound output.
- Never put the words of the user in a log. A line carries a count, a device
  name, or a reason. The sentence in the composer is what they are about to say
  out loud, and it belongs to them. The same goes for an API key.
- Write through `Composer` in `packages/app-ui/blocks/space.tsx` in every mode, including
  `/spaces/new`. A second console would leave one mode without the word tiles,
  the codes, or undo, which a user who cannot type depends on. `composerAction`
  in `packages/core/rules/spaces.ts` holds what each mode says, so a test reads the words
  without a renderer.
- Say a control is unavailable with `aria-disabled`, never with `disabled`, in
  the console and on anything a user waits on. A disabled element cannot hold
  focus, so the browser moves focus to the body and a switch user loses their
  place in the scan. Guard the handler instead.
- Put every title through `freeTitle` in `packages/core/rules/spaces.ts` before writing
  it — the made-up name, the model's, and the user's. Two spaces with one title
  share one address, and SQLite has no unique constraint to catch it.
- Put the Talk and Notes switch in the dock, never in the header. The web app
  puts it there, so a user who knows one app knows the other.
- Pick one row of many with `PickList` in `packages/app-ui/blocks/pick-list.tsx`. Do not
  use a dropdown: it opens on a press and closes when a dwell moves away.
- Put a panel that needs a card of its own through `RightPanel` in
  `packages/app-ui/blocks/screen.tsx`. A panel drawn inside a screen shares the card of
  the inset. `packages/app-ui/layouts/app.tsx` gives it the slot it draws into.
- Keep the right rail of a space in `packages/app-ui/blocks/space-panel.tsx`, and its tabs
  and saved state in `packages/core/rules/panel.ts`, where a test can read them. Add a
  tab as a row of `PANEL_TABS` and a card beside `Phrases`, never as a second
  rail.
- Keep the model and the sliders in the card of the rail, in
  `packages/app-ui/blocks/speech-settings.tsx`. Both are heard in the next sentence, and a
  user who must leave the space to mend them loses the words they were writing.
- Keep the service and the list of voices on `/voice`, never in the card. A
  service is chosen once, and an account holds a hundred voices, each one to be
  heard before it is taken. `/voice` keeps the cloning too.
- Keep the rules of a note in `packages/core/rules/notes.ts`, and the screen in
  `packages/app-ui/pages/notes.tsx`.
- Save a note without a Save button. A user who types slowly must never lose
  words to a button they did not press.
- Read a note aloud through `markdownToVoiceText`. A voice says `Monday`, not
  `# Monday`. A voice-over writes no message.
- Keep the rules of a presentation and an export in
  `packages/core/rules/present.ts`, and the stage in
  `packages/app-ui/blocks/present.tsx`. Present is an overlay, never a route: a
  route would need a window title, an opening path, and a place in the frozen
  route list, and the address must stay on the note the user is holding.
- Let a presentation run with no voice at all. Silence is a mode, not a
  failure: big words and a partner who reads them is the oldest assistive move
  there is, and it is the reason Present needs no setup.
- Move to the next chunk when `speak()` resolves, never on a timer. It resolves
  when the sound stops, so the story keeps the pace of the voice.
- Say `Present`, `Export`, `Text`, `Audio`, and `Video`, and never the retired
  name for any of them. A test reads every source file for it.
- Save a file through `src/services/export.ts`, with the WebView download
  support. Say why a row cannot run in the place of its own description, and
  keep its target. A row that disappears teaches the user nothing.
- Keep the rules of a space in `packages/core/rules/spaces.ts`, where a test can read them
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
  `packages/core/autocomplete`, where a test can read them without a renderer.
  It is the one autocomplete implementation used by both applications.
- Speak through `speak()` in `src/services/speech.ts`. Every voice meets the
  `SpeechProvider` interface, so a screen never names a service. Spoken
  messages use the native playback commands, where the process tap receives
  them. Use `src/services/player.ts` only for voice-list previews.
- A cloud voice that fails must fall back to the voice of the operating
  system. Silence is the worst answer for a user who cannot speak.
- Give each control of a phrase row a 44px target, through `RowButton` in
  `packages/app-ui/blocks/phrase-panel.tsx`. A user of September points with
  less accuracy than a typical browser user.
- Keep the rules of a phrase, a code, and a shortcut idea in `packages/core/rules/phrases.ts`,
  and the rules of a stripe in `packages/core/rules/stripes.ts`. A change there
  applies to both applications.
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
  through `BrandMark` in `packages/app-ui/blocks/brand.tsx`. The Apple logo is the U+F8FF glyph from the
  macOS system font, which `system-ui` supplies. Apple asks for a written
  trademark licence before a third party shows this mark.
- Keep the rule for the first route in `openingPath`, in `src/rules/app-nav.ts`. It
  is an allowlist of app paths. A saved address that names no screen must not
  decide where the app opens.
- Add a screen as a route in `src/main.tsx`. Keep the step rules in
  `src/rules/onboarding.ts`, where a test can read them.
- Keep the settings sections in `src/rules/settings-nav.ts`, where a test can read
  them, the section list in `packages/app-ui/layouts/settings.tsx`, and the screens in
  `packages/app-ui/pages/settings.tsx`. Give each path an icon in `packages/app-ui/layouts/settings.tsx`.
  The icon record is typed by path.
- Keep the parts that setup and settings share in `packages/app-ui/blocks/services.tsx`: the mode
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
