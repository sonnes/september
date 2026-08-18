# @/packages/notes

Local-first note authoring, space-scoped notes, and slide presentation for
September. Browser builds use IndexedDB; desktop builds use SQLite through Rust
record RPC.

## Public API

### Components

| Export               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `NoteEditor`         | Rich text editor with file upload, slides preview, and optional autosave           |
| `EditableNoteTitle`  | Inline editable note title                                                         |
| `SpaceNotes`         | In-place note editor for a Talk space (title + `NoteActions` header), autosaved    |
| `NoteActions`        | Per-note editor-header actions: voice-over play/stop, audio download, reel popover |
| `NoteTabs`           | Working-set strip of note tabs above the composer; overflow collapses to a list    |
| `SlidesPresentation` | Slide-by-slide presentation with voice-over and autoplay                           |

### Query hooks

These return the same data shape on both platforms and re-render after local or
external changes. TanStack Query reads IndexedDB collections in the browser and
Rust records on desktop.

```ts
const { notes, isLoading, error } = useNotes({ searchQuery, spaceId });
const allSpaceNotes = useNotes({ scope: 'space-notes', searchQuery }); // notes across all spaces
const { note, isLoading, error } = useNote(id);

// Resolve an id-free note slug within a space. Reactive — `noteId` is undefined
// until the space's notes load and a name match is found (legacy `…-<uuid>`
// slugs still resolve). `noteIdFromSlug(slug, notes)` is the pure form.
const { noteId, isLoading } = useNoteIdFromSlug(spaceId, noteSlug);
```

### Mutations

Plain async functions that `throw` on failure remain available for non-React
callers. React components use `useCreateNoteMutation`,
`useUpdateNoteMutation`, and `useDeleteNoteMutation`. These TanStack Query
hooks update the notes cache optimistically where possible and roll it back if
the write fails. Toasts stay at call sites.

```ts
import { createNote, deleteNote, updateNote } from '@/packages/notes';

const note = await createNote({ space_id: spaceId, name: 'Morning note', content: '' });
await updateNote(note.id, { name: 'My note', content: '# Hello' });
await deleteNote(note.id);
```

### Types

```ts
import type { CreateNoteData, Note, UpdateNoteData } from '@/packages/notes';
```

### Reel theme re-exports

The shared reel look tokens (`reelPair`, `ROLE_SPECS`, `captionRoles`,
`ensureReelFonts`, grain/vignette/watermark constants) and the `ReelCaption`/
`ReelWord` shells are re-exported from the package index so the marketing
landing page can render the same frame chrome without the voice-over pipeline.
See "Reel theme" below for their semantics.

## Data layout

| Collection       | IndexedDB db    | Key         | Query indexes                  |
| ---------------- | --------------- | ----------- | ------------------------------ |
| `noteCollection` | `app-documents` | `id` (uuid) | `id`, `space_id`, `updated_at` |

The IndexedDB name stays `app-documents` so existing local notes survive the rename.
Name search uses a leading-wildcard `ilike`, which TanStack DB 0.6 cannot serve
from a `BasicIndex`. It scans the rows selected by the other query conditions.

Notes store `id`, `space_id?`, `name?`, `content`, `created_at`, `updated_at`.
Rows with `space_id` are notes that belong to one Talk space. `/notes` lists
notes across all spaces. Notes mode uses `/notes/:spaceSlug/:noteSlug` for
individual notes; Talk mode uses `/talk/:spaceSlug`.

New notes start without a stored title. The editor shows `Untitled note` as a
placeholder and generates the first title from note content on the first save.

Desktop builds store the same note object in the SQLite `documents`
collection. Rust owns record versions and tombstones. No note code opens SQLite
directly. Deleting a space removes its scoped notes in the same Rust transaction
as the space, messages, and saved phrases.

## Space notes

`SpaceNotes` renders the note editor as the writing surface, with `EditableNoteTitle` and
`NoteActions` (voice-over · download · reel) as its editor header. `NoteTabs` renders the note
selector as a working-set strip directly above the composer — the same slot pinned phrase rows
occupy in Talk — and navigates to `/spaces/$spaceSlug/notes/$noteSlug` on selection.

## Reel export

`NoteActions` opens a reel export popover for the selected note and exports it as a
vertical MP4 reel. Export requires a speech provider that returns character timing — ElevenLabs (exact) or Kokoro
(estimated, fully on-device); see `reelTimingSupported` in `lib/reel.ts`. The browser generates the
audio and timing with the user's configured voice, renders 1080x1920 PNG caption frames with Canvas, and muxes those frames with the
audio through `ffmpeg.wasm`.

Caption text is sized and wrapped by the shared pretext engine (`computePretextLayout` from
`@/packages/audio`) — each caption chunk fills the frame at the largest font that fits and wraps to
multiple lines, so on-screen text matches the live preview instead of a fixed font. The active word
swaps to the pair's contrasting tint; already-spoken words dim.

### Reel theme (`lib/reel-theme.ts`)

`reel-theme.ts` is the single source both renderers (the DOM story player and the canvas exporter)
consume, so the exported MP4 matches the in-app preview. It holds:

- `REEL_PAIRS` — six Tailwind colour pairs (`bg` 900/950, `display` 200, `support` 50) as hex plus a
  `bgClass` twin for the DOM side. `DEFAULT_PAIR_KEY` is `stone`; `reelPair(key)` looks one up.
- `captionRoles(captions)` — the deterministic role rule: a chunk is `display` when it is the first
  chunk or the previous chunk ended a sentence (`. ! ?`), otherwise `support`. `ROLE_SPECS` gives each
  role its font (Playfair Display 500 / Noto Sans 700), line-height, max-font ratio, and box-height
  ratio; `roleColors(pair, role)` gives the base and active word colours.
- Chrome + word-state constants (grain opacity, vignette geometry, watermark ratios,
  `SPOKEN_OPACITY`/`UNSPOKEN_OPACITY`) shared by both renderers.
- `ensureReelFonts()` — both renderers await it before their first layout so `measureText`/`fillText`
  and the DOM fit use the loaded serif (`document.fonts.ready` alone can miss an unfetched face).

The export panel offers a six-swatch colour picker (default `stone`); the choice reaches both the
story player and the MP4 via `pairKey` and is not persisted.

The wasm core loads only when the user exports a reel. If browser rendering or `ffmpeg.wasm` fails,
the export popover reports the failure and leaves the note unchanged. Cross-origin isolation headers are
already required by the app for `SharedArrayBuffer`; those same headers keep a future multithreaded
ffmpeg core possible.

Browser builds download voice-over audio and reel video with the existing
anchor flow. Desktop builds send the generated bytes to Rust and use a native
save dialog. The webview never receives the selected destination path.

Presentation mode opens as a named Tauri window on desktop. The browser build
continues to use its existing popup window.

### Play (story player)

The export panel also has a **Play** button that opens `NoteReelStoryPlayer` — a fullscreen 9:16
overlay that plays the reel like an Instagram story: one caption chunk at a time with a segmented
progress bar (one segment per caption), synced to the spoken audio via `useSlideVoiceOver`. Tap
zones (or arrow keys) skip chunks, tap-center / Space pauses, Esc closes, and playback auto-closes
at the end. Like export, it needs a timed voice (ElevenLabs or Kokoro) for chunk timing. Caption chunks come from the same
`alignmentToReelWords` + `wordsToReelCaptions` used by the MP4, so the on-screen chunks match.
