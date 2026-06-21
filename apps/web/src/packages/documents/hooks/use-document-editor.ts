'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { updateDocument } from '../mutations';
import { useDocument } from './use-document';

export interface UseDocumentEditorOptions {
  documentId: string;
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

export interface UseDocumentEditorReturn {
  // State
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
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
  autoSave = false,
  autoSaveDelayMs = 600,
}: UseDocumentEditorOptions): UseDocumentEditorReturn {
  const { document, isLoading } = useDocument(documentId);

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSlidesDialogOpen, setIsSlidesDialogOpen] = useState(false);
  const [prevDocumentId, setPrevDocumentId] = useState<string | null>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const documentContent = document?.content || '';

  // Sync content when document changes (render-phase update pattern)
  if (document && (document.id !== prevDocumentId || (!isDirty && documentContent !== content))) {
    setPrevDocumentId(document.id);
    setContent(documentContent);
    setIsDirty(false);
    setSaveError(null);
  }

  const handleContentChange = useCallback((_content: string, markdown: string) => {
    setContent(markdown);
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!document?.id) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      await updateDocument(document.id, { content });
      toast.success('Document updated');
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save document';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [document, content]);

  useEffect(() => {
    if (!autoSave || !document?.id || !isDirty) return;

    const documentId = document.id;
    const contentToSave = content;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      setSaveError(null);
      updateDocument(documentId, { content: contentToSave })
        .then(() => {
          if (contentRef.current === contentToSave) {
            setIsDirty(false);
          }
        })
        .catch(err => {
          setSaveError(err instanceof Error ? err.message : 'Failed to save document');
        })
        .finally(() => setIsSaving(false));
    }, autoSaveDelayMs);

    return () => window.clearTimeout(timeout);
  }, [autoSave, autoSaveDelayMs, content, document?.id, isDirty]);

  const handleUploadFile = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleSlidesPreview = useCallback(() => {
    setIsSlidesDialogOpen(true);
  }, []);

  const handleTextExtracted = useCallback(
    async (text: string) => {
      if (!document) return;
      try {
        const existing = document.content || '';
        await updateDocument(document.id, { content: existing + text });
        setIsUploadDialogOpen(false);
        setIsDirty(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to append extracted text');
      }
    },
    [document]
  );

  return {
    content,
    isDirty,
    isSaving,
    saveError,
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
