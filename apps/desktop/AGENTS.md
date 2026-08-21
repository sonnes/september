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
- Call the Rust backend from `src/os.ts` or a module like it. Do not call
  `invoke` from a component.
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
