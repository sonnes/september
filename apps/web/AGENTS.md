# September Web — Claude

Assistive communication app for people with ALS or MND. This app is a Vite SPA with React 19, TanStack Router, Tailwind CSS 4, and shadcn/ui.

This app belongs to the root pnpm workspace. `src/router.tsx` gives the shared
route tree of `@september/app-ui/routes` the browser shell and the web-only
pages, and the public landing page stays at `/`. Browser services and
platform-only rules live in `src/`. Common rules, autocomplete, primitives,
tokens, layouts, blocks, and screens live in the root `packages/*` workspace.

The browser uses one native IndexedDB database named `september`. Its bounded blob stores keep generated speech files. Do not add another browser database or a second persistence abstraction.

## Build

Use `pnpm` — never `npm` or `yarn`. Run from `apps/web/` (or `pnpm -C apps/web <script>` from the repo root; `make dev` is a root shortcut).

| Command              | Purpose                            |
| -------------------- | ---------------------------------- |
| `pnpm install`       | Install dependencies               |
| `pnpm dev`           | Dev server (Vite)                  |
| `pnpm build`         | Type-check and build the SPA        |
| `pnpm start`         | Preview the web production build   |
| `pnpm test`          | Run tests (Vitest)                 |

Run `pnpm lint` from the repository root. One ESLint config, `eslint.config.mjs`, covers every package.

The production output is `dist/`. Vercel serves prerendered public pages and `app.html` for application routes.

## Code Style

- Import pure rules from `@september/core`, primitives from `@september/ui`, and
  application screens from `@september/app-ui`.
- Shared application UI reaches the browser through `@platform/adapter`. Keep
  that alias mapped to `src/platform.ts`, and to
  `@september/app-ui/test/platform` in Vitest. Put shared work in
  `packages/app-ui/services/`, and only browser work in `src/`.
- Add a route that both apps have in `packages/app-ui/routes.tsx`. Add a public
  web-only page to `PUBLIC_PAGES` in `src/public-pages.ts`, and any other
  web-only page in `src/router.tsx`. Preserve the web-only landing page at `/`.
- Use `useNavigate` and `Link` from `@tanstack/react-router`.
- Styling: shadcn/ui + Tailwind. Font family is Noto Sans (self-hosted via `@fontsource/noto-sans`). Note titles and headings use Fraunces (`@fontsource-variable/fraunces`, `font-heading`).
- React Query owns the UI cache. `src/services/repository.ts` owns all durable browser data.
- Keep blob writes chunked and bounded by the repository's least-recently-used byte limit.
- Cloud provider keys stay in IndexedDB. Components must not keep a second copy.
- All hooks must have explicit return type interfaces
- Prefer editing existing files over creating new ones

## Module Structure

Each package must have an `index.ts`, a `package.json`, and a `README.md`.

**READ and UPDATE the README.md in each module directory before and after making changes.**
