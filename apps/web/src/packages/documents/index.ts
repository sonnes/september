// Components
export { DocumentList } from './components/document-list';
export { DocumentEditor } from './components/document-editor';
export { EditableDocumentTitle } from './components/editable-document-title';
export { SpaceNotes } from './components/space-notes';
export { SlidesPresentation } from './components/slides-presentation';

// Live-query hooks
export { useDocuments } from './hooks/use-documents';
export { useDocument } from './hooks/use-document';

// Plain async mutations (throw on failure; toasts live at call sites)
export {
  createDocument,
  updateDocument,
  deleteDocument,
  deleteDocumentsForSpace,
} from './mutations';

// Types
export type { Document, CreateDocumentData, UpdateDocumentData } from './types';
