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

The test suite covers interactions, routes, browser services, and persistence.
It does not treat landing-page copy or CSS choices as application behavior.

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

| Variable           | Holds                           |
| ------------------ | ------------------------------- |
| `UMAMI_SCRIPT_URL` | The address of `script.js`      |
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

| File                          | Served at               | Holds                           |
| ----------------------------- | ----------------------- | ------------------------------- |
| `dist/index.html`             | `/`                     | The landing page, already drawn |
| `dist/help/index.html`        | `/help`                 | Help, with every task listed    |
| `dist/help/<slug>/index.html` | `/help/<slug>`          | One guide each                  |
| `dist/app.html`               | every application route | The empty shell                 |

One file per page, because one cannot be all of them. A reader of `/` or of a
guide gets the words and the first paint without waiting for the bundle, and a
crawler gets them without running JavaScript at all. A deep link to an
application route gets the empty shell, so it never paints the marketing page
first.

`PRERENDERED_PATHS` in `src/rules/prerender.ts` is the list, and it derives the
guides from `HELP_GUIDES`. Writing a new guide prerenders it. Nothing else can
go on the list unless it can render without browser storage. The legal notices
also meet that requirement.

The markup is static: the browser mounts over it rather than hydrating it. The
title each page renders is moved into its own head, since a crawler reads the
head and not the body.

Each page is a folder index served by Vercel at the slashless path used by the app.
`vercel.json` sets `trailingSlash` to `false`. Missing assets fall through to
`app.html`. `src/prerender.test.tsx` checks the public markup and output paths.
See `docs/concepts/prerendered-pages.md`.

## Legal notices

`/privacy-policy` and `/terms-of-service` are public, prerendered pages.
They remain available before setup and link from the landing footer.
`src/pages/legal.tsx` contains their text and shared contact section.
They are web-only routes and do not change the shared application route contract.

The notices describe a personal open-source project in India. The terms follow
the root MIT `LICENSE`: broad reuse rights, no warranty, and no guaranteed
support. Applicable statutory rights remain intact. The privacy notice covers
local storage, optional providers, and website metadata. GitHub issues are the
public contact route; users must not post private information there.

`docs/research/2026-09-05-india-legal-review.md` records the legal sources and
limits of this review. A software licence does not supply privacy consent or
exempt a personal project from applicable law.


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
the web-only landing and legal pages remain local.

The setup routes are `/welcome`, `/profile`, `/connect`, and `/finish`.

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
- `/spaces/$slug/agent`
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

The landing page moves from the hero into the working Talk demo. Agent
customization has its own request-and-result section. Its preview shows the
phrases or note produced by the selected example. The complete Agent
conversation remains expandable.

Public copy calls writing-model features “AI assistance.”

The examples follow the About narrative: express opinions, change your mind,
make jokes, and create something. The hero proposes an idea; Talk shares a
reaction; Agent prepares a Silo discussion space and spoiler-free theory notes. Family,
friends, work, and Silo each supply different phrases, codes, and typing prompts. The note demo tells a
bedtime story, with family celebrations and project pitches as other examples. These examples use marketing-only data.

Spaces and saved phrases share one composer. Notes and Voice use native
expandable panels with keyboard support. Privacy and the founder story follow
the demos. Compact browser and Mac choices provide the final calls to action.

The Mac section presents the full desktop app with Apple Intelligence and an
alpha download. Its direct DMG link targets `v0.1.0-alpha.1` for Apple Silicon
and macOS 26 or later. Update this link when a new desktop alpha ships.

The landing sections demonstrate the real feature machinery on marketing-only
data: the phrase chapter runs `matchCode`, the Present chapter runs
`presentChunks`, and the Agent preview reads the demo tool arguments. Its
expandable conversation uses `@september/app-ui/blocks/agent-transcript`. A change to one of those
contracts changes the landing page too.

`/help` and `/help/$guideSlug` render the shared task-based Help screen. These
routes stay outside the finished-setup guard, so a direct Help link works
before setup is complete, and it is what lets the build prerender them. The setup sidebar also opens the setup guide inline
without navigating or changing the current answers. An unknown guide slug
returns to `/help`.

## Browser data

`src/services/repository.ts` owns one native IndexedDB database named
`september`. The database contains application rows, a separate
`agent_messages` transcript store, and a bounded speech-file cache.

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
portable settings and all spaces, Talk messages, Agent messages, notes, saved
phrases, and usage events. It does not contain service keys, local audio
output, migration state, or the speech cache. Version 1 files remain valid and
restore with an empty Agent transcript.

The repository validates a selected file before it starts a write. It replaces
the portable settings and domain stores in one IndexedDB transaction. A failed
write aborts the transaction and keeps the existing data. The same file can be
restored in the Mac app. Import changes the retired `camera` panel tab from an
older desktop backup to `phrases`.

## Browser services

The browser uses the Web Speech API for the system voice. A system voice does not create an audio file.

ElevenLabs speech files use a cache key made from the text and every sound setting. The repository splits each file into 1 MiB chunks. The cache holds at most 100 MiB and evicts whole least-recently-used files before each write. Reading a file refreshes its access time. A cache failure does not prevent new speech from playing.

A note presents and exports from its own screen. `src/services/export.ts` saves the words as `.md` with nothing configured, the voice as `.mp3` from the speech cache, and a 9:16 `.mp4` with word-synced captions. `synthesizeTimed` in `src/services/os.ts` asks ElevenLabs for the sound and the character alignment together and caches both in the same bounded store. `src/services/video.ts` draws every frame on a canvas and joins them to the voice with `ffmpeg.wasm`, which needs the cross-origin isolation headers in `public/_headers`. Video assembly stays in the browser; cloud speech requests still send text to ElevenLabs. See `docs/concepts/note-present-export.md`.

OpenRouter and ElevenLabs calls go directly from the browser. Their keys stay
in IndexedDB. Setup stores one default writing-model setting. Every AI text
request uses this setting. If the separate Suggestions setting is not null,
Suggestions use it.

`src/services/ai.ts` reaches OpenRouter through `@earendil-works/pi-ai`. It
loads the client on the first call that needs a model, so a reader who only
opens the landing page or a Help guide never downloads it. The client knows
the published rates of the models it lists, which is where a recorded cost
comes from; a model it does not list still runs, and records no cost rather
than a wrong one.

The space Agent uses OpenRouter's tool-calling request shape.
When the model choice is Automatic, the Agent uses `openrouter/free` so
OpenRouter selects a currently available free model that supports the tools.
Its tool definitions are fixed by core, every write waits for approval, and its
transcript never enters Talk history or speech. An Agent turn streams: its
words reach the screen as they arrive, and the stored row replaces them when
the turn ends.

CAUTION: Browser scripts on this origin can read these keys. The desktop app gives stronger protection because it stores keys in the macOS Keychain.

Apple Intelligence and September Microphone are not available in the browser.
The interface shows their unavailable state in the desktop UI positions.

## Source layout

```text
src/
├── components/   web-only landing-page sections
├── pages/        the web-only home and legal pages
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

## Speech and unfinished words

Stop invalidates pending speech as well as stopping playback. A cancelled
cloud result cannot play or trigger system fallback. An already submitted
provider request can still complete and incur charges. Speech failures show a
retry message. Present pauses on an unsuccessful chunk instead of advancing.

Talk saves unfinished words per space in local settings (`talk-draft:<id>`).
These drafts are device-local and are not included in portable backups.
A successful message save clears only the draft that was sent; later edits
remain. Pending or failed saves show their state and offer retry on failure.

Note text and titles start saving on each edit. Writes through the note-update
hook run in order within a space. Browser close/reload warns while a save is
pending or failed; the Mac window close action waits until those edits save.
A forced quit, crash, or power loss before a write finishes can still lose it.

The Welcome screen includes a Terms & privacy summary before personal details
or service connections. It summarizes local storage, optional providers, and
the MIT terms. Full policies open in the browser while setup stays in place.
Get started advances to About you; it does not record consent to optional processing.

## Connect OpenRouter

Choose Connect OpenRouter in setup or Settings, then authorize September in
the new browser window. The PKCE verifier stays in memory. The callback at
`public/oauth/openrouter.html` contains no analytics or application bootstrap;
it clears the authorization code from the address and sends it to the waiting
window through BroadcastChannel. The checked key is saved in IndexedDB.
Cancel or retry if authorization does not finish within five minutes.

The callback must be served as a static file on the same origin as the app.
Vercel adds no-store and no-referrer headers for `/oauth/*`.

The application sidebar starts collapsed at every desktop width. The toggle
or Ctrl/Command-B expands it; resizing preserves that choice.
