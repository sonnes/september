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

## Routes

`src/router.tsx` defines the complete route graph. The route contract test keeps the application paths equal to the desktop paths and protects the browser landing page at `/`.

The application route components come from `@september/app-ui`. The router and
the web-only landing page remain local.

The setup routes are `/welcome`, `/profile`, `/mode`, `/connect`, and `/finish`. The application routes are:

- `/dashboard`
- `/spaces`
- `/spaces/new`
- `/spaces/$slug/talk`
- `/spaces/$slug/notes`
- `/spaces/$slug/notes/$noteSlug`
- `/voice`
- `/voice/clone`
- `/help`
- `/settings`
- `/settings/writing`
- `/settings/usage`
- `/settings/connections/$provider`

The `/` route opens the public landing page. Its calls to action open setup at `/welcome`. All hosting targets must return `index.html` for a direct application-route request.

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

## Browser services

The browser uses the Web Speech API for the system voice. A system voice does not create an audio file.

ElevenLabs speech files use a cache key made from the text and every sound setting. The repository splits each file into 1 MiB chunks. The cache holds at most 100 MiB and evicts whole least-recently-used files before each write. Reading a file refreshes its access time. A cache failure does not prevent new speech from playing.

OpenRouter and ElevenLabs calls go directly from the browser. Their access keys stay in IndexedDB.

CAUTION: Browser scripts on this origin can read these access keys. The desktop app gives stronger protection because it stores keys in the macOS Keychain.

Apple Intelligence and the desktop virtual devices are not available in the browser. The interface shows their unavailable state in the desktop UI positions.

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
