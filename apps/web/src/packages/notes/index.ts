// Components
export { NoteEditor } from './components/note-editor';
export { EditableNoteTitle } from './components/editable-note-title';
export { SpaceNotes } from './components/space-notes';
export { NoteActions } from './components/note-actions';
export { NoteTabs } from './components/note-tabs';
export { SlidesPresentation } from './components/slides-presentation';

// Live-query hooks
export { useNotes } from './hooks/use-notes';
export { useNote } from './hooks/use-note';
export {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useUpdateNoteMutation,
} from './hooks/use-note-mutations';
export {
  useNoteIdFromSlug,
  noteIdFromSlug,
  type UseNoteIdFromSlugReturn,
} from './hooks/use-note-id-from-slug';

// Plain async mutations (throw on failure; toasts live at call sites)
export { createNote, updateNote, deleteNote, deleteNotesForSpace } from './mutations';

// Types
export type { Note, CreateNoteData, UpdateNoteData } from './types';

// Reel theme + caption shells — the shared look tokens both reel renderers use.
// Exported for the marketing landing page's reel prototype, which renders the
// same frame chrome without the full voice-over pipeline.
export {
  GRAIN_OPACITY,
  REEL_GRAIN_SVG,
  REEL_VIGNETTE_GRADIENT,
  ROLE_SPECS,
  WATERMARK_TEXT,
  captionRoles,
  ensureReelFonts,
  reelPair,
} from './lib/reel-theme';
export type { CaptionRole, ReelPair, ReelPairKey } from './lib/reel-theme';
export type { ReelCaption, ReelWord } from './lib/reel';
