# Replace Next.js with TanStack Start (on Vite) — `apps/web/`

> On approval, move this to `docs/plans/2026-06-13-replace-next-with-vite.md` (per project convention) and keep running notes in `docs/notes/2026-06-13-replace-next-with-vite.md`.

## Context

`apps/web/` runs on **Next.js 16** but is, in practice, a **client-rendered SPA**: data lives in the browser (IndexedDB via TanStack DB, local-first), and `components/context/client-providers.tsx` gates all app rendering behind `useSyncExternalStore` with `getServerSnapshot = () => false` — so every `(app)`/`(onboarding)` route renders `null` on the server. Next's SSR/App-Router machinery buys nothing here; only home `/`, `/privacy-policy`, `/terms-of-service` have crawlable content.

Goal: replace Next with **TanStack Start** (which runs on Vite) — file-based routing, a prerendered SPA shell, and no Next coupling — preserving all current behavior. Confirmed decisions: **SPA mode** (prerender the 3 marketing/legal routes, client-only elsewhere); **drop the 4 dead API routes**; **adopt a `src/` layout**.

**Hard constraint:** `@built-in-ai/web-llm` (used in `packages/ai/hooks/use-generate.ts`) needs `SharedArrayBuffer` → cross-origin isolation. The COOP/COEP/CORP headers Next sets today **must** be preserved on every response.

## Verified facts (grep-confirmed)

- The 4 API routes (`app/api/{speech,transcribe,extract-text,ai/generate-corpus}/route.ts`) have **zero client callers**. `services/{gemini,elevenlabs}.ts` are imported **only** by those routes → drop routes + both services.
- **No `NEXT_PUBLIC_*` / `process.env`** reads anywhere in client code. `NEXT_PUBLIC_SITE_URL` in CI is unused → drop it.
- `next-themes` is used by `packages/ui/components/sonner.tsx` (`useTheme`); it's framework-agnostic → **keep** it (works under Vite, no provider required for the default).
- Next coupling sites: `next/navigation` (5× `useRouter`, 1× `usePathname`, 2× `useSearchParams`), `next/link` (~10 app + `packages/chats`, `packages/documents`), `next/image` (5 app + `packages/keyboards`), `next/font/google` (root layout), `useRouter` in `packages/onboarding`, `metadata` exports (14 files), dynamic routes via Next 15 `use(params)`.
- `app/globals.css` has a **stale `@source "../../../packages/recording"`** line (package deleted).

## Approach

### 1. Tooling & config (Phase 1)

- **Add deps** (`apps/web`): `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`, `@fontsource/noto-sans`. Dev: `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@tanstack/eslint-plugin-router`.
- **Remove deps:** `next`, `eslint-config-next`, `@tailwindcss/postcss`. **Keep** `next-themes`.
- **Delete:** `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`.
- **`vite.config.ts`** (new):
  ```ts
  plugins: [
    tsconfigPaths(),
    tailwindcss(),                       // @tailwindcss/vite (replaces PostCSS)
    tanstackStart({                      // MUST precede viteReact()
      spa: { enabled: true },
      pages: [{ path: '/' }, { path: '/privacy-policy' }, { path: '/terms-of-service' }],
    }),
    viteReact(),
  ],
  ssr: { noExternal: [/^@september\//] },           // raw-TS workspace pkgs must be Vite-transformed
  server:  { headers: COISO_HEADERS },              // local dev cross-origin isolation
  preview: { headers: COISO_HEADERS },
  ```
  where `COISO_HEADERS` = the three headers in §5. `ssr.noExternal` replaces Next's `transpilePackages` for the prerender pass.
- **`tsconfig.json`:** remove `{ "name": "next" }` plugin and `.next/**` + `next-env.d.ts` includes; keep `paths`, but remap **`@/*` → `./src/*`**; add `routeTree.gen.ts` ignore in eslint (generated).
- **`eslint.config.mjs`:** flat config with `@eslint/js` + `typescript-eslint` + react-hooks/react-refresh (+ optional tanstack/router plugin), ignoring `routeTree.gen.ts` and build output.
- **`package.json` scripts:** `dev: vite dev`, `build: vite build`, `start: vite preview`, `lint: eslint .`. Root scripts unchanged (already filter to `@september/web`).

### 2. `src/` layout move (Phase 1)

Move app code under `src/`: `app/` → `src/routes/`, `components/` → `src/components/`, `services/` → (deleted, see §4), `app/globals.css` → `src/styles/globals.css`. `@/*` now resolves to `./src/*`, so existing `@/components/...` imports keep working with no per-file edits. In `globals.css`: delete the stale `recording` `@source` line, correct the remaining `@source` relative paths for the new depth, and replace `font-family: var(--font-noto-sans)` with `'Noto Sans', Helvetica, sans-serif`.

### 3. Root + route tree (Phases 2–3)

- **`src/routes/__root.tsx`** — `createRootRoute({ head, notFoundComponent, shellComponent })`. `head` carries the global title/description + OG/Twitter/robots meta, favicon/manifest `links`, the global stylesheet (`import appCss from '@/styles/globals.css?url'` → `links`), and the Umami script (`scripts: [{ defer, src, 'data-website-id', crossOrigin: 'anonymous' }]` — `crossOrigin` added for COEP safety). `shellComponent` renders `<html><head><HeadContent/></head><body class="font-sans antialiased h-full">{children}<Toaster/><Scripts/></body></html>`. Import `@fontsource/noto-sans/{400,500,700}.css` here (self-hosted — **never** a Google Fonts `<link>`, which COEP would block). `notFoundComponent` = the former `not-found.tsx`.
- **Route mapping** (file-based; route groups → pathless `_` layout routes, `[id]` → `$id`, `metadata` → route `head`, `use(params)` → `Route.useParams()`):

  | Current | New `src/routes/` |
  |---|---|
  | `app/page.tsx` (home) | `index.tsx` — **drop its `ClientProviders` wrapper** so it prerenders non-empty (marketing sections need no providers) |
  | `app/(marketing)/layout.tsx` | `_marketing.tsx` |
  | `app/(marketing)/{privacy-policy,terms-of-service}/page.tsx` | `_marketing/{privacy-policy,terms-of-service}.tsx` (prerendered) |
  | `app/(app)/layout.tsx` | `_app.tsx` (`ClientProviders` + `SidebarLayout`) |
  | `app/(app)/{dashboard,talk,clone,voices}/page.tsx` | `_app/{dashboard,talk,clone,voices}.tsx` |
  | `app/(app)/chats/page.tsx` | `_app/chats/index.tsx` |
  | `app/(app)/chats/[id]/{layout,page}.tsx` | `_app/chats/$id/route.tsx` (Editor/Speech providers, `useParams`) + `_app/chats/$id/index.tsx` |
  | `app/(app)/write/{page,[id]/page}.tsx` | `_app/write/index.tsx`, `_app/write/$id.tsx` |
  | `app/(app)/settings/page.tsx` + `{providers,speech,suggestions,transcription}/page.tsx` | `_app/settings/index.tsx` + `_app/settings/{providers,speech,suggestions,transcription}.tsx` |
  | `app/(onboarding)/{layout, onboarding/page}.tsx` | `_onboarding.tsx`, `_onboarding/onboarding.tsx` |
  | `app/{display,present}/[id]/{layout,page}.tsx` | `display.$id.tsx`, `present.$id.tsx` (merge layout's `ClientProviders` into the route component) |
  | `app/preview/page.tsx` | `preview.tsx` |
  | metadata-only layouts (`chats`, `settings`, `onboarding` layout.tsx) | no route file — fold their titles into child `head`s |
  | co-located `form.tsx` / `loading-skeleton.tsx` | keep alongside, **prefix `-`** (e.g. `-form.tsx`) so the router ignores them |

  `title.template` (`%s | September …`) has no built-in equivalent → bake the suffix per-route (small `src/lib/seo.ts` helper).

### 4. Import-site swaps (Phase 4)

- **Navigation** (all from `@tanstack/react-router`): `useRouter().push/replace` → `useNavigate()({ to, replace })`; `usePathname()` → `useLocation({ select: l => l.pathname })`; `useSearchParams().get()` → route `validateSearch` + `Route.useSearch()`.
  - **OAuth `?code`** (`settings/providers.tsx`): `validateSearch: s => ({ code: typeof s.code==='string' ? s.code : undefined })`, read via `Route.useSearch()`; strip with `navigate({ to:'/settings/providers', search:{}, replace:true })`. `exchangedRef` guard unchanged.
  - **`voices.tsx`**: `validateSearch` for `?search=similar`.
- **`next/link` → `Link`** (`href`→`to`): app sites + `packages/chats/components/chat-list.tsx`, `packages/documents/components/document-list.tsx` → **add `@tanstack/react-router` dep** to those two packages.
- **`packages/onboarding`**: `useRouter().push('/talk')` → `useNavigate()` → **add `@tanstack/react-router` dep**.
- **`next/image` → `<img loading="lazy">`**: app sites + `packages/keyboards/components/custom-keyboard.tsx` (no new dep).
- Root layout body drops `notoSans.className` (font now via fontsource + `font-sans`).

### 5. Cross-origin isolation headers (Phase 1 + 7) — CRITICAL

Preserve on **every** response (static prerendered HTML + assets):
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```
- **Prod:** `vercel.json` `headers` block with `source: "/(.*)"` (Vercel applies at the edge to all responses, including static). Same file sets framework/build config (§6).
- **Local:** Vite `server`/`preview` `headers` (above).

### 6. Drop dead server code (Phase 5)

Delete `src/routes/api/**` (don't recreate the API routes) and `services/{gemini,elevenlabs}.ts` (no other importers). No `createServerFn` needed — reintroduce later if a real server feature appears.

### 7. Deployment / CI (Phase 7)

- Add **`vercel.json`**: COOP/COEP headers (§5) + framework preset `Vite` (or "Other"), build command `pnpm --filter @september/web build`, output dir = TanStack Start's SPA output (confirm from build; likely `.output/public` or `dist`). Target a **static** output (API routes are gone).
- `.github/workflows/production.yaml`: the `vercel pull/build/deploy --prebuilt` flow stays; **remove the unused `NEXT_PUBLIC_SITE_URL` env**. Ensure the Vercel project no longer auto-detects Next (config via `vercel.json` / dashboard).

## Critical files

- `apps/web/app/layout.tsx` → `src/routes/__root.tsx` — global head, Umami (`crossOrigin`), fontsource, Toaster, COEP-sensitive shell.
- `apps/web/next.config.ts` → `vite.config.ts` + `vercel.json` — COOP/COEP headers, `transpilePackages` → `ssr.noExternal`.
- `apps/web/app/(app)/settings/providers/form.tsx` — trickiest swap: OAuth `?code` via `validateSearch`/`useSearch`/`useNavigate`.
- `apps/web/app/globals.css` → `src/styles/globals.css` — Tailwind v4 import, stale `@source recording` removal, font rewire.
- `apps/web/components/context/client-providers.tsx` — mount-gate; keep as-is (scopes providers per route group). Remove only its wrap around the prerendered home.
- `packages/{chats,documents,keyboards,onboarding}` — the only Next imports inside shared packages.

## Risks / gotchas

1. **COEP can break WebLLM** if any cross-origin subresource lacks CORP. Self-host fonts (fontsource), add `crossOrigin:'anonymous'` to the Umami script. **Test WebLLM generation end-to-end after migration** — it validates the whole COOP/COEP chain.
2. **Prerender runs in Node** — the 3 prerendered routes (`/`, legal) must not touch `window`/IndexedDB at module/render top-level (they're pure presentational → safe). Removing `ClientProviders` from home is required for non-empty prerendered HTML.
3. **Tailwind `@source`** — verify package-only classes still appear in built CSS after the `@tailwindcss/vite` switch and path fixes (silent regressions otherwise).
4. **Raw-TS workspace resolution** — `ssr.noExternal: [/^@september\//]` is mandatory; if a package pulls a browser-only/WASM dep into SSR (e.g. `kokoro-js`, `konva`, `web-llm`), keep it behind client-only routes / tune `ssr.external` or `optimizeDeps.exclude`.
5. Co-located `form`/`loading-skeleton` files in `src/routes/` must use the `-` ignore prefix or they're treated as routes.

## Verification

1. `pnpm --filter @september/web build` succeeds; `routeTree.gen.ts` is generated.
2. `pnpm --filter @september/web dev` (or `vite preview`): every route loads — home, marketing/legal, dashboard, chats + `chats/$id`, write + `write/$id`, talk, clone, voices (`?search=similar`), all settings tabs, onboarding, `display/$id`, `present/$id`, preview, 404.
3. **Prerender check:** `/`, `/privacy-policy`, `/terms-of-service` emit non-empty static HTML (view source).
4. **Header check:** `curl -I` an HTML page and a hashed asset (via `vite preview`) → all three COOP/COEP/CORP headers present.
5. **WebLLM e2e:** run a browser-local WebLLM generation (suggestions) → confirms `SharedArrayBuffer`/cross-origin isolation works.
6. **OAuth flow:** hit `/settings/providers?code=...` → key exchanged, `?code` stripped from URL.
7. **Tailwind:** spot-check a package-only class (sidebar/keyboard) renders styled.
8. `pnpm --filter @september/web lint` and root `pnpm test` pass.
9. Deploy a Vercel **preview** → confirm prerendered SEO HTML + headers in a prod-like env before merging.
