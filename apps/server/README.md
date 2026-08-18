# @september/server

Cloudflare Worker configuration for hosting the September web app. The Worker
serves the built SPA and returns `404` for every `/api/*` route.

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

The committed `public/index.html` lets local development and tests start before
you build the full web app.

## Deploy

Deploying rebuilds the web app, copies `apps/web/dist/client` into `public`, and
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
| `src/index.ts` | Rejects retired API routes and falls back to static assets |
| `src/types.ts` | Declares the static asset binding |
| `wrangler.jsonc` | Configures SPA assets and retires the Durable Object classes |
| `public/_headers` | Adds cross-origin isolation headers for browser-local models |
