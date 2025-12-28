'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUpdateDocument } from './use-update-document';

export interface UseEditableTitleOptions {
  documentId: string;
  initialName?: string;
}

export interface UseEditableTitleReturn {
  // State
  value: string;
  isEditing: boolean;
  isSaving: boolean;

  // Actions
  setValue: (value: string) => void;
  startEditing: () => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useEditableTitle({
  documentId,
  initialName,
}: UseEditableTitleOptions): UseEditableTitleReturn {
  const { updateDocument } = useUpdateDocument();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialName || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync value when initialName changes
  useEffect(() => {
    setValue(initialName || '');
  }, [initialName]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const trimmedValue = value.trim();
    const newName = trimmedValue || undefined;

    // Only update if the name actually changed
    if (newName !== (initialName || undefined)) {
      setIsSaving(true);
      try {
        await updateDocument(documentId, { name: newName });
      } catch (error) {
        console.error('Failed to update document name:', error);
        // Revert to original value on error
        setValue(initialName || '');
      } finally {
        setIsSaving(false);
      }
    }

    setIsEditing(false);
  }, [isSaving, value, initialName, documentId, updateDocument]);

  const handleCancel = useCallback(() => {
    setValue(initialName || '');
    setIsEditing(false);
  }, [initialName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  return {
    value,
    isEditing,
    isSaving,
    setValue,
    startEditing,
    handleSave,
    handleCancel,
    handleKeyDown,
  };
}
