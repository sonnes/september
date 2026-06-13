# September Web — Claude

Assistive communication app (ALS/MND). TanStack Start on Vite, React 19, Tailwind CSS 4, shadcn/ui. Local-first with IndexedDB via TanStack DB.

Standalone pnpm project (no workspace): its own `package.json`, `pnpm-lock.yaml`, and `node_modules` live here in `apps/web/`. Shared modules live in `src/packages/*` and are imported via the `@/packages/*` alias (`@/*` → `src/*`, not separate packages). File-based routing lives in `src/routes/` (route groups use the `_name` pathless-layout convention, dynamic params use `$id`). SPA mode with the home + legal pages prerendered.

## Build

Use `pnpm` — never `npm` or `yarn`. Run from `apps/web/` (or `pnpm -C apps/web <script>` from the repo root; `make dev` is a root shortcut).

| Command          | Purpose                        |
| ---------------- | ------------------------------ |
| `pnpm install`   | Install dependencies           |
| `pnpm dev`       | Dev server (Vite)              |
| `pnpm build`     | Production build (+ prerender) |
| `pnpm start`     | Preview the production build   |
| `pnpm lint`      | Lint                           |
| `pnpm test`      | Run tests (Vitest)             |

Cross-origin isolation (COOP/COEP/CORP) is required for WebLLM's `SharedArrayBuffer`. Headers are set for dev/preview by a middleware plugin in `vite.config.ts` and for production in `vercel.json` — keep both in sync.

## Code Style

- Shared code lives in `src/packages/*` (import via the `@/packages/*` alias)
- Routing: TanStack Router file routes in `src/routes/`. Navigate with `useNavigate`/`Link` from `@tanstack/react-router`; per-route `<title>`/meta via the route `head` option
- Forms: `react-hook-form` + `zodResolver`. Use `@/packages/ui/components/form`
- Styling: shadcn/ui + Tailwind. Font family is Noto Sans (self-hosted via `@fontsource/noto-sans`)
- Query hooks return `{ data, isLoading, error }` — error shape: `{ message: string }`
- Mutations are plain async functions that throw; toasts live at call sites; hooks are reserved for live queries and stateful flows.
- All hooks must have explicit return type interfaces
- Prefer editing existing files over creating new ones

## Module Structure

Every `src/packages/*` module should have: `components/`, `hooks/`, `lib/`, `types/`, `index.ts`, `package.json` (kept for `main`/`exports` resolution), `README.md`.

**READ and UPDATE the README.md in each module directory before and after making changes.**
