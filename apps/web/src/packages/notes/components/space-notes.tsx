'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Download, FileText, Loader2, Plus, Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn, timeAgo } from '@/packages/shared';
import { useSpeech } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { EmptyState } from '@/packages/ui/components/empty-state';
import { LoadingState } from '@/packages/ui/components/loading-state';

import { useNotes } from '../hooks/use-notes';
import { useSlideVoiceOver } from '../hooks/use-slide-voice-over';
import { createNote as createNoteMutation } from '../mutations';
import type { Note } from '../types';
import { EditableNoteTitle } from './editable-note-title';
import { NoteEditor } from './note-editor';

type SpaceNotesProps = {
  spaceId: string;
  className?: string;
  selectedId?: string | null;
  onSelectedIdChange?: (id: string | null, note?: Note) => void;
};

function markdownToVoiceText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function notePreview(note: Note): string {
  const preview = markdownToVoiceText(note.content);

  if (!preview) return 'No note text yet';
  return preview.length > 88 ? `${preview.slice(0, 85)}...` : preview;
}

function voiceFileName(noteName?: string): string {
  const base = (noteName || 'note')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'note'}-voice-over.mp3`;
}

function downloadableAudioSrc(blob: string): string {
  return blob.startsWith('data:') ? blob : `data:audio/mp3;base64,${blob}`;
}

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
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNote = useCallback(async () => {
    setIsCreating(true);
    try {
      const note = await createNoteMutation({
        space_id: spaceId,
        content: '',
      });
      setSelectedId(note.id, note);
      toast.success('Note created');
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to create note',
      });
    } finally {
      setIsCreating(false);
    }
  }, [setSelectedId, spaceId]);

  return { createNote: handleCreateNote, isCreating };
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
          <EditableNoteTitle noteId={selectedNote.id} name={selectedNote.name} />
          <NoteEditor noteId={selectedNote.id} variant="note" autoSave className="min-h-0 flex-1" />
        </>
      )}
    </section>
  );
}

export function SpaceNotesPanel({
  spaceId,
  className,
  selectedId,
  onSelectedIdChange,
}: SpaceNotesProps) {
  const { notes, isLoading } = useNotes({ spaceId });
  const { generateSpeech } = useSpeech();
  const { speak, stop, isGenerating, isPlaying } = useSlideVoiceOver();
  const [isDownloading, setIsDownloading] = useState(false);
  const { selectedNote, setSelectedId } = useNoteSelection({
    notes,
    selectedId,
    onSelectedIdChange,
  });
  const { createNote, isCreating } = useCreateSpaceNote(spaceId, setSelectedId);
  const voiceText = markdownToVoiceText(selectedNote?.content ?? '');

  const handleVoiceOver = useCallback(() => {
    if (isPlaying || isGenerating) {
      stop();
      return;
    }
    speak(voiceText);
  }, [isGenerating, isPlaying, speak, stop, voiceText]);

  const handleDownloadVoiceOver = useCallback(async () => {
    if (!selectedNote || !voiceText) return;

    const promise = generateSpeech(voiceText);
    if (!promise) {
      toast.error('No speech provider is available.');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await promise;
      if (!response.blob) {
        toast.error('Download is not available for this voice.');
        return;
      }

      const link = document.createElement('a');
      link.href = downloadableAudioSrc(response.blob);
      link.download = voiceFileName(selectedNote.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Voice-over downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download voice-over');
    } finally {
      setIsDownloading(false);
    }
  }, [generateSpeech, selectedNote, voiceText]);

  if (isLoading) {
    return <LoadingState variant="page" label="Loading notes..." className={className} />;
  }

  return (
    <aside data-notes-panel className={cn('flex min-h-0 flex-col gap-3 p-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Notes</h2>
          <p className="text-xs text-muted-foreground">{notes.length} in this space</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="New note"
          onClick={createNote}
          disabled={isCreating}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No notes yet
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {notes.map(note => {
            const isSelected = selectedNote?.id === note.id;
            return (
              <div
                key={note.id}
                data-note-card
                className={cn(
                  'w-full rounded-lg border bg-card p-3 shadow-sm transition-colors',
                  isSelected && 'border-primary/50 bg-accent text-accent-foreground'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id, note)}
                  className="flex min-h-20 w-full flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <span className="line-clamp-1 text-sm font-semibold">
                    {note.name || 'Untitled note'}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {notePreview(note)}
                  </span>
                  <span className="mt-auto text-xs text-muted-foreground">
                    Updated {timeAgo(note.updated_at)}
                  </span>
                </button>

                {isSelected && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon-lg"
                      onClick={handleVoiceOver}
                      disabled={!voiceText}
                      variant={isPlaying || isGenerating ? 'outline' : 'default'}
                      aria-label={
                        isGenerating
                          ? 'Generating voice-over'
                          : isPlaying
                            ? 'Stop voice-over'
                            : 'Generate voice-over'
                      }
                      title={
                        isGenerating
                          ? 'Generating voice-over'
                          : isPlaying
                            ? 'Stop voice-over'
                            : 'Generate voice-over'
                      }
                    >
                      {isGenerating ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : isPlaying ? (
                        <Square className="size-4" aria-hidden />
                      ) : (
                        <Volume2 className="size-4" aria-hidden />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon-lg"
                      variant="outline"
                      onClick={handleDownloadVoiceOver}
                      disabled={!voiceText || isDownloading}
                      aria-label={isDownloading ? 'Preparing audio' : 'Download audio'}
                      title={isDownloading ? 'Preparing audio' : 'Download audio'}
                    >
                      {isDownloading ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Download className="size-4" aria-hidden />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
