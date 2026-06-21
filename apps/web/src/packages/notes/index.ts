// Components
export { NoteEditor } from './components/note-editor';
export { EditableNoteTitle } from './components/editable-note-title';
export { SpaceNotes, SpaceNotesPanel } from './components/space-notes';
export { SlidesPresentation } from './components/slides-presentation';

// Live-query hooks
export { useNotes } from './hooks/use-notes';
export { useNote } from './hooks/use-note';

// Plain async mutations (throw on failure; toasts live at call sites)
export { createNote, updateNote, deleteNote, deleteNotesForSpace } from './mutations';

// Types
export type { Note, CreateNoteData, UpdateNoteData } from './types';
