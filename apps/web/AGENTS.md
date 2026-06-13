# September Web — Claude

Assistive communication app (ALS/MND). TanStack Start on Vite, React 19, Tailwind CSS 4, shadcn/ui. Local-first with IndexedDB via TanStack DB.

Self-contained app: the `@september/*` modules live in `src/packages/*` and are resolved via the `@september/*` tsconfig path alias (no longer separate workspace packages). File-based routing lives in `src/routes/` (route groups use the `_name` pathless-layout convention, dynamic params use `$id`). SPA mode with the home + legal pages prerendered.

## Build

Use `pnpm` from workspace root — never `npm` or `yarn`.

| Command                              | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `pnpm install`                       | Install dependencies            |
| `pnpm --filter @september/web dev`   | Dev server (Vite)               |
| `pnpm --filter @september/web build` | Production build (+ prerender)   |
| `pnpm --filter @september/web start` | Preview the production build     |
| `pnpm --filter @september/web lint`  | Lint                            |
| `pnpm --filter @september/web test`  | Run tests (Vitest)              |

Cross-origin isolation (COOP/COEP/CORP) is required for WebLLM's `SharedArrayBuffer`. Headers are set for dev/preview by a middleware plugin in `vite.config.ts` and for production in `vercel.json` — keep both in sync.

## Code Style

- Shared code lives in `src/packages/*` as `@september/*` modules (import via the `@september/*` alias)
- Routing: TanStack Router file routes in `src/routes/`. Navigate with `useNavigate`/`Link` from `@tanstack/react-router`; per-route `<title>`/meta via the route `head` option
- Forms: `react-hook-form` + `zodResolver`. Use `@september/ui/components/form`
- Styling: shadcn/ui + Tailwind. Font family is Noto Sans (self-hosted via `@fontsource/noto-sans`)
- Query hooks return `{ data, isLoading, error }` — error shape: `{ message: string }`
- Mutations are plain async functions that throw; toasts live at call sites; hooks are reserved for live queries and stateful flows.
- All hooks must have explicit return type interfaces
- Prefer editing existing files over creating new ones

## Module Structure

Every `src/packages/*` module should have: `components/`, `hooks/`, `lib/`, `types/`, `index.ts`, `package.json` (kept for `main`/`exports` resolution), `README.md`.

**READ and UPDATE the README.md in each module directory before and after making changes.**
