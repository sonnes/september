'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/packages/shared';
import { Input } from '@/packages/ui/components/input';

import { UNTITLED_NOTE_NAME, noteNameIsUnset } from '../lib/title';
import { updateNote } from '../mutations';

interface EditableNoteTitleProps {
  noteId: string;
  name?: string;
  className?: string;
}

export function EditableNoteTitle({ noteId, name, className }: EditableNoteTitleProps) {
  const savedName = noteNameIsUnset(name) ? '' : (name ?? '');
  const [draft, setDraft] = useState(savedName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(savedName);
  }, [noteId, savedName]);

  const save = async (nextDraft = draft) => {
    if (isSaving) return;

    const nextName = nextDraft.trim() || undefined;
    const currentName = savedName.trim() || undefined;
    if (nextName === currentName) return;

    setIsSaving(true);
    try {
      await updateNote(noteId, { name: nextName });
    } catch (err) {
      console.error('Failed to save note title:', err);
      setDraft(savedName);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Input
      aria-label="Note title"
      value={draft}
      placeholder={UNTITLED_NOTE_NAME}
      disabled={isSaving}
      onChange={event => setDraft(event.target.value)}
      onBlur={event => {
        void save(event.currentTarget.value);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(savedName);
          event.currentTarget.blur();
        }
      }}
      className={cn('h-11 bg-card text-base font-semibold', className)}
    />
  );
}
