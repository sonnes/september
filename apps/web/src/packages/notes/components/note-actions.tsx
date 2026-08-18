'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Download, Film, Loader2, Square, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/packages/shared';
import { saveFile } from '@/packages/shared/lib/data';
import { useSpeech } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';

import { useSlideVoiceOver } from '../hooks/use-slide-voice-over';
import { audioDataUri, markdownToVoiceText } from '../lib/reel';
import type { Note } from '../types';
import { NoteReelExportPanel } from './note-reel-export-panel';

interface NoteActionsProps {
  note: Note | undefined;
  className?: string;
}

function voiceFileName(noteName?: string): string {
  const base = (noteName || 'note')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'note'}-voice-over.mp3`;
}

/**
 * Per-note actions in the notes editor header: voice-over play/stop,
 * download, and a reel export popover. Logic lifted out of the retired
 * SpaceNotesPanel so it renders exactly when the note is on screen.
 */
export function NoteActions({ note, className }: NoteActionsProps) {
  const { generateSpeech } = useSpeech();
  const { speak, stop, isGenerating, isPlaying } = useSlideVoiceOver();
  const [isDownloading, setIsDownloading] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);

  const voiceText = markdownToVoiceText(note?.content ?? '');
  const busy = isPlaying || isGenerating;

  const handleVoiceOver = useCallback(() => {
    if (busy) {
      stop();
      return;
    }
    speak(voiceText);
  }, [busy, speak, stop, voiceText]);

  const handleDownload = useCallback(async () => {
    if (!note || !voiceText) return;

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

      const audio = await fetch(audioDataUri(response.blob)).then(result => result.blob());
      if (await saveFile(audio, voiceFileName(note.name))) {
        toast.success('Voice-over downloaded');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download voice-over');
    } finally {
      setIsDownloading(false);
    }
  }, [generateSpeech, note, voiceText]);

  // Dependency-free popover behaviour — close on Esc or outside pointer.
  useEffect(() => {
    if (!reelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReelOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (reelRef.current && !reelRef.current.contains(e.target as Node)) {
        setReelOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [reelOpen]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        size="lg"
        className="rounded-full"
        onClick={handleVoiceOver}
        disabled={!voiceText}
        variant={busy ? 'outline' : 'default'}
        aria-label={
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
        Voice-over
      </Button>

      <Button
        type="button"
        size="icon-lg"
        variant="outline"
        className="rounded-full"
        onClick={handleDownload}
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

      <div ref={reelRef} className="relative">
        <Button
          type="button"
          size="lg"
          variant={reelOpen ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => setReelOpen(open => !open)}
          disabled={!voiceText}
          aria-label="Export reel"
          aria-expanded={reelOpen}
          aria-controls="note-reel-popover"
        >
          <Film className="size-4" aria-hidden />
          Reel
        </Button>
        {reelOpen && (
          <div
            id="note-reel-popover"
            role="dialog"
            aria-label="Reel export"
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
          >
            <NoteReelExportPanel id="note-reel-panel" note={note} voiceText={voiceText} />
          </div>
        )}
      </div>
    </div>
  );
}
