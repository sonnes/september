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
  useNoteIdFromSlug,
  noteIdFromSlug,
  type UseNoteIdFromSlugReturn,
} from './hooks/use-note-id-from-slug';

// Plain async mutations (throw on failure; toasts live at call sites)
export { createNote, updateNote, deleteNote, deleteNotesForSpace } from './mutations';

// Types
export type { Note, CreateNoteData, UpdateNoteData } from './types';
