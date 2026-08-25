# @september/server

Cloudflare Worker configuration for hosting the September web app. The Worker
serves the built SPA and returns `404` for every `/api/*` route.

`/`, `/help`, and every Help guide are prerendered pages with a file each, so
none of them can also answer for the routes that have no file of their own. A
request that matches no asset falls through to the Worker, which serves
`app.html`, the empty shell. The Worker needs no rule per prerendered page.

The prerendered pages are folder indexes, so `html_handling` is
`drop-trailing-slash`. The default would answer `/help` with a 307 to `/help/`,
a wasted round trip on a path every link in the app already uses without the
slash.

September no longer exposes Google login, cloud sync, or remote blob APIs. Web
data stays in IndexedDB. Desktop data stays in SQLite and local files.

## Develop

Run these commands from this directory:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm dev
```

The committed placeholders under `public/` let local development and tests start
before you build the full web app. Each carries a `data-page` attribute, which
is how `src/index.test.ts` tells apart which file answered a request.

## Deploy

Deploying rebuilds the web app, copies `apps/web/dist` into `public`, and
publishes the Worker:

```sh
pnpm deploy
```

No login client ID or session-signing secret is required.

The `v2` Wrangler migration deletes the retired `UserManagerDO` and
`UserDataDO` instances when this Worker is next deployed. Export any old sync
records before that deployment if they must be retained. Removing the R2
binding does not delete the existing bucket or its objects.

## Layout

| File | Purpose |
| --- | --- |
| `src/index.ts` | Rejects retired API routes and serves the shell for application routes |
| `src/types.ts` | Declares the static asset binding |
| `wrangler.jsonc` | Configures the assets and retires the Durable Object classes |
| `public/_headers` | Adds cross-origin isolation headers for browser-local models |
| `public/index.html` | Placeholder for the prerendered landing page |
| `public/app.html` | Placeholder for the application shell |
| `public/help/index.html` | Placeholder for prerendered Help |
| `public/help/save-a-phrase/index.html` | Placeholder for a prerendered Help guide |
