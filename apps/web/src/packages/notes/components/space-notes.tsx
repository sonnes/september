'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/packages/shared';
import { Button } from '@/packages/ui/components/button';
import { EmptyState } from '@/packages/ui/components/empty-state';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { useCreateNoteMutation } from '../hooks/use-note-mutations';
import { useNotes } from '../hooks/use-notes';
import type { Note } from '../types';
import { EditableNoteTitle } from './editable-note-title';
import { NoteActions } from './note-actions';
import { NoteEditor } from './note-editor';

type SpaceNotesProps = {
  spaceId: string;
  className?: string;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null, note?: Note) => void;
};

function useNoteSelection({
  notes,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}: {
  notes: Note[];
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null, note?: Note) => void;
}) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId ?? internalSelectedId;

  const setSelectedId = useCallback(
    (id: string | null, note?: Note) => {
      if (onSelectedIdChange) {
        onSelectedIdChange(id, note);
        return;
      }
      setInternalSelectedId(id);
    },
    [onSelectedIdChange]
  );

  const selectedNote = useMemo(
    () => notes.find(note => note.id === selectedId) ?? notes[0],
    [notes, selectedId]
  );

  useEffect(() => {
    if (!selectedNote) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selectedNote.id) {
      setSelectedId(selectedNote.id, selectedNote);
    }
  }, [selectedId, selectedNote, setSelectedId]);

  return { selectedNote, setSelectedId };
}

function useCreateSpaceNote(
  spaceId: string,
  setSelectedId: (id: string | null, note?: Note) => void
) {
  const { isPending, mutateAsync: createNote } = useCreateNoteMutation();

  const handleCreateNote = useCallback(async () => {
    try {
      const note = await createNote({
        space_id: spaceId,
        content: '',
      });
      setSelectedId(note.id, note);
      toast.success('Note created');
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create note',
      });
    }
  }, [createNote, setSelectedId, spaceId]);

  return { createNote: handleCreateNote, isCreating: isPending };
}

export function SpaceNotes({
  spaceId,
  className,
  selectedId,
  onSelectedIdChange,
}: SpaceNotesProps) {
  const { notes, isLoading } = useNotes({ spaceId });
  const { selectedNote, setSelectedId } = useNoteSelection({
    notes,
    selectedId,
    onSelectedIdChange,
  });
  const { createNote, isCreating } = useCreateSpaceNote(spaceId, setSelectedId);

  if (isLoading) {
    return <LoadingState variant="page" label="Loading notes..." className={className} />;
  }

  if (notes.length === 0) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col gap-4', className)}>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            icon={FileText}
            title="No notes in this space"
            description="Create a longer note, then generate voice-over from it when you are ready."
            action={
              <Button type="button" size="lg" onClick={createNote} disabled={isCreating}>
                <Plus className="size-4" aria-hidden />
                New note
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <section className={cn('flex min-h-0 flex-col gap-3', className)}>
      {selectedNote && (
        <>
          <div className="flex items-start justify-between gap-3">
            <EditableNoteTitle
              noteId={selectedNote.id}
              name={selectedNote.name}
              className="min-w-0 flex-1"
            />
            <NoteActions note={selectedNote} className="shrink-0" />
          </div>
          <NoteEditor noteId={selectedNote.id} variant="note" autoSave className="min-h-0 flex-1" />
        </>
      )}
    </section>
  );
}
