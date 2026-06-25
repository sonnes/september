# @/packages/notes

Local-first note authoring, space-scoped notes, and slide presentation for September. Backed by TanStack DB (IndexedDB).

## Public API

### Components

| Export               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `NoteEditor`         | Rich text editor with file upload, slides preview, and optional autosave           |
| `EditableNoteTitle`  | Inline editable note title                                                         |
| `SpaceNotes`         | In-place note editor for a Talk space, autosaved as the user writes                |
| `SpaceNotesPanel`    | Right-panel note selector with voice-over, audio download, and reel export actions |
| `SlidesPresentation` | Slide-by-slide presentation with voice-over and autoplay                           |

### Live-query hooks

These return live data from IndexedDB and re-render on changes.

```ts
const { notes, isLoading, error } = useNotes({ searchQuery, spaceId });
const allSpaceNotes = useNotes({ scope: 'space-notes', searchQuery }); // notes across all spaces
const { note, isLoading, error } = useNote(id);
```

### Mutations

Plain async functions that `throw` on failure. Toasts live at call sites.

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

## Data layout

| Collection       | IndexedDB db    | Key         |
| ---------------- | --------------- | ----------- |
| `noteCollection` | `app-documents` | `id` (uuid) |

The IndexedDB name stays `app-documents` so existing local notes survive the rename.

Notes store `id`, `space_id?`, `name?`, `content`, `created_at`, `updated_at`.
Rows with `space_id` are notes that belong to one Talk space. `/notes` lists
notes across all spaces. Notes mode uses `/notes/:spaceSlug/:noteSlug` for
individual notes; Talk mode uses `/talk/:spaceSlug`.

New notes start without a stored title. The editor shows `Untitled note` as a
placeholder and generates the first title from note content on the first save.

## Space notes

`SpaceNotes` renders the note editor as the writing surface. `SpaceNotesPanel` renders the note
selector in the app right panel; the selected note's voice-over and audio download actions are icon
buttons in that panel.

## Reel export

`SpaceNotesPanel` can expand an inline export panel for the selected note and export it as a
vertical MP4 reel. Export requires the current speech provider to be ElevenLabs because the video
captions use ElevenLabs character timing. The browser generates the MP3 and timing with the user's
configured voice, renders 1080x1920 PNG caption frames with Canvas, and muxes those frames with the
audio through `ffmpeg.wasm`.

Caption text is sized and wrapped by the shared pretext engine (`computePretextLayout` from
`@/packages/audio`) — each caption chunk fills the frame at the largest font that fits and wraps to
multiple lines, so on-screen text matches the live preview instead of a fixed font. The active word
is highlighted; already-spoken words dim.

The wasm core loads only when the user exports a reel. If browser rendering or `ffmpeg.wasm` fails,
the inline panel reports the failure and leaves the note unchanged. Cross-origin isolation headers are
already required by the app for `SharedArrayBuffer`; those same headers keep a future multithreaded
ffmpeg core possible.

### Play (story player)

The export panel also has a **Play** button that opens `NoteReelStoryPlayer` — a fullscreen 9:16
overlay that plays the reel like an Instagram story: one caption chunk at a time with a segmented
progress bar (one segment per caption), synced to the spoken audio via `useSlideVoiceOver`. Tap
zones (or arrow keys) skip chunks, tap-center / Space pauses, Esc closes, and playback auto-closes
at the end. Like export, it needs ElevenLabs for chunk timing. Caption chunks come from the same
`alignmentToReelWords` + `wordsToReelCaptions` used by the MP4, so the on-screen chunks match.
