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
- Keep the shell in `src/app.tsx`: a left indigo sidebar holds the brand, the
  setup title, and the step list. Show all sections. Do not add collapsible
  groups.
- Call the Rust backend from `src/os.ts` or a module like it. Do not call
  `invoke` from a component.
- Add a screen as a route in `src/main.tsx`. Keep the step rules in
  `src/onboarding.ts`, where a test can read them.
- Follow the root `DESIGN.md` for every screen.
- Keep the 1376×1032 baseline usable before adapting a screen to other sizes.
- Write a failing test before each implementation change.
