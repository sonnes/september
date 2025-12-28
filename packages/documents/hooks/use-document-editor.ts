'use client';

import { useCallback, useState } from 'react';
import { useDocument } from './use-document';
import { useUpdateDocument } from './use-update-document';

export interface UseDocumentEditorOptions {
  documentId: string;
  autoSaveDelay?: number; // Optional: implement autosave
}

export interface UseDocumentEditorReturn {
  // State
  content: string;
  isDirty: boolean;
  document: ReturnType<typeof useDocument>['document'];
  isLoading: ReturnType<typeof useDocument>['isLoading'];

  // Dialog states
  isUploadDialogOpen: boolean;
  isSlidesDialogOpen: boolean;

  // Actions
  handleContentChange: (content: string, markdown: string) => void;
  handleSave: () => Promise<void>;
  handleUploadFile: () => void;
  handleSlidesPreview: () => void;
  handleTextExtracted: (text: string) => Promise<void>;
  setIsUploadDialogOpen: (open: boolean) => void;
  setIsSlidesDialogOpen: (open: boolean) => void;
}

export function useDocumentEditor({
  documentId,
}: UseDocumentEditorOptions): UseDocumentEditorReturn {
  const { document, isLoading } = useDocument(documentId);
  const { updateDocument } = useUpdateDocument();

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSlidesDialogOpen, setIsSlidesDialogOpen] = useState(false);
  const [prevDocumentId, setPrevDocumentId] = useState<string | null>(null);

  // Sync content when document changes (render-phase update pattern)
  if (document && document.id !== prevDocumentId) {
    setPrevDocumentId(document.id);
    setContent(document.content || '');
    setIsDirty(false);
  }

  const handleContentChange = useCallback((_content: string, markdown: string) => {
    setContent(markdown);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!document?.id) return;
    await updateDocument(document.id, { content });
    setIsDirty(false);
  }, [document, content, updateDocument]);

  const handleUploadFile = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleSlidesPreview = useCallback(() => {
    setIsSlidesDialogOpen(true);
  }, []);

  const handleTextExtracted = useCallback(async (text: string) => {
    if (!document) return;
    const existing = document.content || '';
    await updateDocument(document.id, { content: existing + text });
    setIsUploadDialogOpen(false);
    setIsDirty(false);
  }, [document, updateDocument]);

  return {
    content,
    isDirty,
    document,
    isLoading,
    isUploadDialogOpen,
    isSlidesDialogOpen,
    handleContentChange,
    handleSave,
    handleUploadFile,
    handleSlidesPreview,
    handleTextExtracted,
    setIsUploadDialogOpen,
    setIsSlidesDialogOpen,
  };
}
