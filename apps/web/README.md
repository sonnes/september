# September Web

September Web is the browser edition of the desktop application. Its application screens use the desktop routes, interaction rules, and visual structure. The browser also keeps its public landing page at `/`.

## Develop

Run these commands from `apps/web`:

```sh
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

The development server uses `http://localhost:3009`. The production build writes a Vite SPA to `dist/`.

## Every page names itself

Screens render a `<title>`, which React 19 lifts into the head. `Screen` in
`@september/app-ui/blocks/screen` does it for any screen built from it; a
screen with its own header writes its own, with the words that tell it apart —
`Family · Talk · September` for a space, `Thursday appointment · Family ·
September` for a note. The wording rule is `documentTitle` in
`@september/core/rules/titles`.

`index.html` keeps a plain `<title>September</title>`. It is what a tab shows
before the bundle mounts, and the prerender replaces it with the title each
prerendered page renders.

## Counting the public pages

Every page the browser app serves carries an Umami tag — the prerendered
public pages and the application shell alike. The desktop app carries none.
The build reads two variables and writes the tag into the pages it writes:

| Variable | Holds |
| --- | --- |
| `UMAMI_SCRIPT_URL` | The address of `script.js` |
| `UMAMI_WEBSITE_ID` | The site the counter reports to |

A build with neither writes nothing, so a local build, a fork, and a preview
report to no one.

Two details are load-bearing:

- **`data-auto-track="false"`.** Left to itself the script reads the address
  and the title of every page the user moves to, and a September address names
  the person the user talks to — `/spaces/amma/talk`, and a note slug is what
  they mean to say. Instead the router reports each page itself through
  `services/analytics`, under the path `rules/analytics` allows: the address
  as written for a screen that names nobody, and the shape of the route —
  `/spaces/$slug/talk` — for one that does. The title is replaced too, since
  it carries the same name. A guide slug and a provider name are ours, not the
  user's, so those are reported whole.
- **`crossorigin="anonymous"`.** The site is cross-origin isolated for
  ffmpeg.wasm, and `require-corp` drops a cross-origin script that arrives
  without a resource policy. Umami's script sends CORS headers but no resource
  policy, so without this attribute the browser blocks it and the counter is
  simply absent.

The tracker is loaded by the built HTML and driven from `src/`, both of which
belong to this app alone, so the desktop app reports nothing anywhere.

## The public pages are prerendered

`pnpm build` runs `scripts/prerender.mjs` after Vite. It builds the same
application for Node, renders every path in `PRERENDERED_PATHS`, and writes one
file per page:

| File | Served at | Holds |
| --- | --- | --- |
| `dist/index.html` | `/` | The landing page, already drawn |
| `dist/help/index.html` | `/help` | Help, with every task listed |
| `dist/help/<slug>/index.html` | `/help/<slug>` | One guide each |
| `dist/app.html` | every application route | The empty shell |

One file per page, because one cannot be all of them. A reader of `/` or of a
guide gets the words and the first paint without waiting for the bundle, and a
crawler gets them without running JavaScript at all. A deep link to an
application route gets the empty shell, so it never paints the marketing page
first.

`PRERENDERED_PATHS` in `src/rules/prerender.ts` is the list, and it derives the
guides from `HELP_GUIDES`. Writing a new guide prerenders it. Nothing else can
go on the list: every other screen reads IndexedDB, which a build machine has
none of.

The markup is static: the browser mounts over it rather than hydrating it. The
title each page renders is moved into its own head, since a crawler reads the
head and not the body.

Each page is a folder index, the one shape both hosts serve from the filesystem
at the slashless path the app's links use. `vercel.json` sets `trailingSlash`
to `false` and `apps/server` sets `html_handling` to `drop-trailing-slash`, so
neither host puts a redirect in front of a prerendered page.
`src/prerender.test.tsx` holds the rules to it, and `src/index.test.ts` in
`apps/server` holds the routing to it. See
`docs/concepts/prerendered-pages.md`.

## Brand assets

`pnpm brand:generate` draws the mark and the share card with `satori`, then
writes them to `public/`: `logo.svg`, the favicons, the app icons, and
`og.png`. Run it after a change to the mark, to the landing hero, or to the
words on the card, and commit what it writes.

The share card is 1200x630, the size every link preview expects. `index.html`
names it with an absolute URL, because a crawler does not resolve a relative
one. `src/share-card.test.ts` holds both to that.

## Routes

`src/router.tsx` defines the complete route graph. The route contract test keeps the application paths equal to the desktop paths and protects the browser landing page at `/`.

The application route components come from `@september/app-ui`. The router and
the web-only landing page remain local.

The setup routes are `/welcome`, `/profile`, `/mode`, `/connect`, and `/finish`.

Setup runs once, and the two guards mirror each other: an application route
asked for before setup is finished turns back to `/welcome`, and a setup step
asked for after it is finished goes on to `/dashboard`. So the landing page's
calls to action, a bookmark, and the back button all land a returning user in
the app. `src/setup-guard.test.ts` holds both directions.

The application routes are:

- `/dashboard`
- `/spaces`
- `/spaces/new`
- `/spaces/$slug/talk`
- `/spaces/$slug/notes`
- `/spaces/$slug/notes/$noteSlug`
- `/voice`
- `/voice/clone`
- `/help`
- `/help/$guideSlug`
- `/settings`
- `/settings/writing`
- `/settings/usage`
- `/settings/data`
- `/settings/connections/$provider`

The `/` route opens the public landing page. Its calls to action open setup at `/welcome`, which sends a returning user on to `/dashboard`. All hosting targets must return the application shell for a direct application-route request.

`/help` and `/help/$guideSlug` render the shared task-based Help screen. These
routes stay outside the finished-setup guard, so a direct Help link works
before setup is complete, and it is what lets the build prerender them. The setup sidebar also opens the setup guide inline
without navigating or changing the current answers. An unknown guide slug
returns to `/help`.

## Browser data

`src/services/repository.ts` owns one native IndexedDB database named `september`. The database contains application rows and a bounded speech-file cache.

The first start imports data from the old browser databases. The import uses idempotent writes and validates the imported row identifiers. It then removes these databases:

- `app-user-account`
- `app-spaces`
- `app-messages`
- `app-documents`
- `app-saved-phrases`
- `analytics`
- `september-autocomplete`
- `september-audio`

The import also moves the old panel, dismissed-idea, audio-output, and space-mode settings from local storage. It removes the old keys after a successful import.

If another tab blocks database removal, the import keeps the `imported` state. The next start retries removal without another import.

Settings > Data downloads one versioned JSON backup. The file contains the
portable settings and all spaces, messages, notes, saved phrases, and usage
events. It does not contain service keys, local audio output, migration state,
or the speech cache.

The repository validates a selected file before it starts a write. It replaces
the portable settings and domain stores in one IndexedDB transaction. A failed
write aborts the transaction and keeps the existing data. The same file can be
restored in the Mac app. Import changes the retired `camera` panel tab from an
older desktop backup to `phrases`.

## Browser services

The browser uses the Web Speech API for the system voice. A system voice does not create an audio file.

ElevenLabs speech files use a cache key made from the text and every sound setting. The repository splits each file into 1 MiB chunks. The cache holds at most 100 MiB and evicts whole least-recently-used files before each write. Reading a file refreshes its access time. A cache failure does not prevent new speech from playing.

A note presents and exports from its own screen. `src/services/export.ts` saves the words as `.md` with nothing configured, the voice as `.mp3` from the speech cache, and a 9:16 `.mp4` with word-synced captions. `synthesizeTimed` in `src/services/os.ts` asks ElevenLabs for the sound and the character alignment together and caches both in the same bounded store. `src/services/video.ts` draws every frame on a canvas and joins them to the voice with `ffmpeg.wasm`, which needs the cross-origin isolation headers in `public/_headers`. Nothing leaves the browser. See `docs/concepts/note-present-export.md`.

OpenRouter and ElevenLabs calls go directly from the browser. Their keys stay in IndexedDB.

CAUTION: Browser scripts on this origin can read these keys. The desktop app gives stronger protection because it stores keys in the macOS Keychain.

Apple Intelligence and September Microphone are not available in the browser.
The interface shows their unavailable state in the desktop UI positions.

## Source layout

```text
src/
├── components/   web-only landing-page sections
├── pages/        the web-only home page
├── rules/        platform-only rules and core compatibility exports
├── services/     IndexedDB, speech, AI, and browser adapters
└── packages/     remaining browser-only helpers and compatibility exports
```

The root workspace supplies the common source:

- `packages/core` owns pure rules and autocomplete.
- `packages/ui` owns design tokens and generic primitives.
- `packages/app-ui` owns application layouts, blocks, and screens.

The shared UI imports browser services through `@platform/*`, which Vite and
Vitest map to this app's `src/` directory.
