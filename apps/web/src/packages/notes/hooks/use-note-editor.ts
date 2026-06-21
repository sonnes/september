'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { noteContentUpdates } from '../lib/title';
import { updateNote } from '../mutations';
import { useNote } from './use-note';

export interface UseNoteEditorOptions {
  noteId: string;
  autoSave?: boolean;
  autoSaveDelayMs?: number;
}

export interface UseNoteEditorReturn {
  // State
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  note: ReturnType<typeof useNote>['note'];
  isLoading: ReturnType<typeof useNote>['isLoading'];

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

export function useNoteEditor({
  noteId,
  autoSave = false,
  autoSaveDelayMs = 600,
}: UseNoteEditorOptions): UseNoteEditorReturn {
  const { note, isLoading } = useNote(noteId);

  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSlidesDialogOpen, setIsSlidesDialogOpen] = useState(false);
  const [prevNoteId, setPrevNoteId] = useState<string | null>(null);
  const contentRef = useRef(content);
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    contentRef.current = content;
    isDirtyRef.current = isDirty;
  }, [content, isDirty]);

  const noteContent = note?.content || '';

  // Sync content when note changes (render-phase update pattern)
  if (note && (note.id !== prevNoteId || (!isDirty && noteContent !== content))) {
    setPrevNoteId(note.id);
    contentRef.current = noteContent;
    isDirtyRef.current = false;
    setContent(noteContent);
    setIsDirty(false);
    setSaveError(null);
  }

  const handleContentChange = useCallback((_content: string, markdown: string) => {
    contentRef.current = markdown;
    isDirtyRef.current = true;
    setContent(markdown);
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!note?.id) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      await updateNote(note.id, noteContentUpdates(note.name, content));
      toast.success('Note updated');
      isDirtyRef.current = false;
      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save note';
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [note, content]);

  useEffect(() => {
    if (!autoSave || !note?.id || !isDirty) return;

    const autosaveNoteId = note.id;
    const autosaveNoteName = note.name;
    const contentToSave = content;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      setSaveError(null);
      updateNote(autosaveNoteId, noteContentUpdates(autosaveNoteName, contentToSave))
        .then(() => {
          if (contentRef.current === contentToSave) {
            isDirtyRef.current = false;
            setIsDirty(false);
          }
        })
        .catch(err => {
          setSaveError(err instanceof Error ? err.message : 'Failed to save note');
        })
        .finally(() => setIsSaving(false));
    }, autoSaveDelayMs);

    return () => window.clearTimeout(timeout);
  }, [autoSave, autoSaveDelayMs, content, note?.id, note?.name, isDirty]);

  useEffect(() => {
    const currentNoteId = note?.id;
    const currentNoteName = note?.name;
    return () => {
      if (!autoSave || !currentNoteId || !isDirtyRef.current) return;
      void updateNote(currentNoteId, noteContentUpdates(currentNoteName, contentRef.current));
    };
  }, [autoSave, note?.id, note?.name]);

  const handleUploadFile = useCallback(() => {
    setIsUploadDialogOpen(true);
  }, []);

  const handleSlidesPreview = useCallback(() => {
    setIsSlidesDialogOpen(true);
  }, []);

  const handleTextExtracted = useCallback(
    async (text: string) => {
      if (!note) return;
      try {
        const existing = note.content || '';
        const nextContent = existing + text;
        await updateNote(note.id, noteContentUpdates(note.name, nextContent));
        setIsUploadDialogOpen(false);
        setIsDirty(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to append extracted text');
      }
    },
    [note]
  );

  return {
    content,
    isDirty,
    isSaving,
    saveError,
    note,
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
