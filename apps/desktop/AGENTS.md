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
- Style screens with Tailwind utility classes. `src/styles.css` holds the
  Tailwind import and the two font tokens only.
- Add a screen as a route in `src/main.tsx`. Keep the step rules in
  `src/onboarding.ts`, where a test can read them.
- Follow the root `DESIGN.md` for every screen.
- Keep the 1376×1032 baseline usable before adapting a screen to other sizes.
- Write a failing test before each implementation change.
