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

- Keep all desktop UI code inside `apps/desktop/src/`.
- Build forms and controls from the shadcn primitives in
  `src/components/ui/`. Add more with `pnpm dlx shadcn@latest add <name>`.
  Import them through the `@/` alias, which points at `src/`.
- Style the rest with Tailwind utility classes. `src/styles.css` holds the
  Tailwind import, the font tokens, and the shadcn colour tokens. The tokens
  are light-mode only and use the same values as `apps/web`.
- The app has two shells. `src/app.tsx` holds the setup shell: a left indigo
  sidebar with the brand, the setup title, and the step list. `src/shell.tsx`
  holds the app shell: the shadcn `Sidebar` and `SidebarInset` pair. Show all
  sections. Do not add collapsible groups.
- Keep the sidebar destinations in `src/app-nav.ts`, where a test can read
  them. Give each path an icon in `src/shell.tsx`. The icon record is typed by
  path, so a missing icon fails the build.
- Call the Rust backend from a service module: `src/os.ts` for settings and
  the system, `src/data.ts` for the rows, `src/ai.ts` for the writing service.
  Do not call `invoke` from a component or from `src/speech.ts`.
- Change a space with `space_patch`, never with a whole row. Three writers
  change a space and each one knows only its own fields, so a whole-row write
  lets the last writer undo the others.
- Read the sound outputs from `src-tauri/src/audio.rs`. The browser cannot do
  this job: WKWebView lists no output device until the user grants the
  microphone, and September must not ask for one to name a speaker.
- Keep the rules of a space in `src/spaces.ts`, where a test can read them
  without a renderer: the slug, the search, the new title, the relative time,
  the transcript page, and the composer helpers.
- Send every command through `call()` in `src/data.ts`. A Tauri command
  rejects with a string, so a screen that reads `error.message` shows nothing
  without it.
- Ask before an action that erases rows. Use the shadcn `AlertDialog`, and give
  the confirming button the `destructive` variant.
- Give each row the owner from `currentUserId()` in `src/os.ts`. Do not read
  the operating system again after setup.
- Offer words through `useSuggestions()` in `src/suggest.ts`. Keep the rules in
  `src/autocomplete/index.ts`, where a test can read them without a renderer.
  `src/autocomplete/` is a copy of the engine in the web app: change a file
  there only to keep the two apps the same.
- Speak through `speak()` in `src/speech.ts`. Every voice meets the
  `SpeechProvider` interface, so a screen never names a service. Play a file
  through `src/player.ts`, which holds one sound at a time.
- A cloud voice that fails must fall back to the voice of the operating
  system. Silence is the worst answer for a user who cannot speak.
- Keep the rules of a phrase, a code, and a shortcut idea in `src/phrases.ts`,
  and the rules of a stripe in `src/stripes.ts`. Both are ports of the web app.
  Change them in both apps, or in neither.
- A model never writes over a phrase that the user kept. Write new rows with
  `phrase_replace_ai`, which erases only the rows with `pinned = 0`.
- Add a word from the engine with `applySuggestion` in `src/suggest.ts`. The
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
- Keep every API key in the macOS Keychain, through `src-tauri/src/providers.rs`.
  A key must not enter the onboarding draft, SQLite, a Tauri event, a log, or
  the browser storage. A command returns a status, never a key.
- Use a brand mark only from the file that the brand publishes, kept in
  `public/`. Do not redraw one. The September mark is `public/logo.svg`, shown
  through `BrandMark` in `src/brand.tsx`. The Apple logo is the U+F8FF glyph from the
  macOS system font, which `system-ui` supplies. Apple asks for a written
  trademark licence before a third party shows this mark.
- Add a screen as a route in `src/main.tsx`. Keep the step rules in
  `src/onboarding.ts`, where a test can read them.
- Read the saved setup through `currentSetup()` in `src/os.ts`, never through
  `invoke` in a route. The module holds the value it wrote, so a guard right
  after setup sees the new answers.
- Follow the root `DESIGN.md` for every screen.
- Keep the 1376×1032 baseline usable before adapting a screen to other sizes.
- Write a failing test before each implementation change.
