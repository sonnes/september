'use client';

import { useCallback, useMemo, useState } from 'react';

import { useServerFn } from '@tanstack/react-start';
import { Download, Film, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ReelTextViewer, type Alignment } from '@/packages/audio';
import { useAISettings } from '@/packages/ai';
import { useSpeech } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { Callout } from '@/packages/ui/components/callout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/packages/ui/components/dialog';
import { Progress } from '@/packages/ui/components/progress';

import {
  alignmentToReelWords,
  markdownToVoiceText,
  wordsToReelCaptions,
} from '../lib/reel';
import { renderNoteReelVideoFn } from '../lib/reel-export.functions';
import type { Note } from '../types';

type ExportStatus = 'idle' | 'generating-audio' | 'rendering-video' | 'complete';

interface NoteReelExportDialogProps {
  note: Note | undefined;
  voiceText: string;
}

function statusProgress(status: ExportStatus): number {
  switch (status) {
    case 'generating-audio':
      return 35;
    case 'rendering-video':
      return 75;
    case 'complete':
      return 100;
    default:
      return 0;
  }
}

function statusLabel(status: ExportStatus): string {
  switch (status) {
    case 'generating-audio':
      return 'Generating voice timing';
    case 'rendering-video':
      return 'Rendering MP4';
    case 'complete':
      return 'Reel ready';
    default:
      return 'Ready to export';
  }
}

function reelFileName(noteName?: string): string {
  const base = (noteName || 'note')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'note'}-reel.mp4`;
}

function audioSrc(blob: string): string {
  return blob.startsWith('data:') ? blob : `data:audio/mp3;base64,${blob}`;
}

function audioDurationSeconds(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve(audio.duration);
        return;
      }
      reject(new Error('Could not read audio duration'));
    };
    audio.onerror = () => reject(new Error('Could not read audio duration'));
    audio.src = src;
  });
}

export function NoteReelExportDialog({
  note,
  voiceText,
}: NoteReelExportDialogProps) {
  const { generateSpeech } = useSpeech();
  const { speechConfig } = useAISettings();
  const renderReel = useServerFn(renderNoteReelVideoFn);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadHref, setDownloadHref] = useState<string | null>(null);
  const [previewAlignment, setPreviewAlignment] = useState<Alignment | undefined>();
  const [previewDuration, setPreviewDuration] = useState(0);

  const requiresElevenLabs = speechConfig.provider !== 'elevenlabs';
  const fileName = useMemo(() => reelFileName(note?.name), [note?.name]);
  const previewText = voiceText || markdownToVoiceText(note?.content ?? '');

  const reset = useCallback(() => {
    setStatus('idle');
    setIsExporting(false);
    setDownloadHref(null);
    setPreviewAlignment(undefined);
    setPreviewDuration(0);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) reset();
    },
    [reset]
  );

  const handleExport = useCallback(async () => {
    if (!note || !voiceText.trim()) return;

    if (requiresElevenLabs) {
      toast.error('Select an ElevenLabs voice before exporting a reel.');
      return;
    }

    const speechPromise = generateSpeech(voiceText);
    if (!speechPromise) {
      toast.error('No speech provider is available.');
      return;
    }

    setIsExporting(true);
    setDownloadHref(null);

    try {
      setStatus('generating-audio');
      const speech = await speechPromise;

      if (!speech.blob || !speech.alignment) {
        throw new Error('ElevenLabs voice timing is required for reel export.');
      }

      const src = audioSrc(speech.blob);
      const durationSeconds = await audioDurationSeconds(src);
      const words = alignmentToReelWords(speech.alignment);
      const captions = wordsToReelCaptions(words);

      if (!captions.length) {
        throw new Error('No caption timing was generated.');
      }

      setPreviewAlignment(speech.alignment);
      setPreviewDuration(durationSeconds);
      setStatus('rendering-video');

      const result = await renderReel({
        data: {
          audioDataUri: src,
          captions,
          durationSeconds,
        },
      });

      setDownloadHref(`data:${result.contentType};base64,${result.base64}`);
      setStatus('complete');
      toast.success('Reel ready');
    } catch (err) {
      setStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Failed to export reel');
    } finally {
      setIsExporting(false);
    }
  }, [generateSpeech, note, renderReel, requiresElevenLabs, voiceText]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          variant="outline"
          disabled={!voiceText}
          aria-label="Export reel"
          title="Export reel"
        >
          <Film className="size-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export reel</DialogTitle>
          <DialogDescription>
            Create a vertical MP4 from this note using the selected ElevenLabs voice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex min-w-0 flex-col gap-4">
            {requiresElevenLabs && (
              <Callout tone="warning" title="ElevenLabs voice required">
                Reel export needs word timing from ElevenLabs. Select an ElevenLabs voice in speech
                settings, then try again.
              </Callout>
            )}

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{note?.name || 'Untitled note'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {previewText ? `${previewText.split(/\s+/).length} words` : 'No note text'}
                  </p>
                </div>
                <div className="text-sm font-medium text-muted-foreground">{statusLabel(status)}</div>
              </div>
              <Progress value={statusProgress(status)} className="mt-4" />
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Download file</div>
              <div className="mt-1 break-all text-sm text-muted-foreground">{fileName}</div>
            </div>
          </div>

          <div className="flex justify-center rounded-lg border bg-muted/30 p-3">
            <div className="aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-lg border bg-foreground text-background">
              <ReelTextViewer
                text={previewText || 'No note text'}
                alignment={previewAlignment}
                currentTime={previewAlignment ? Math.min(previewDuration / 2, 3) : undefined}
                duration={previewAlignment ? previewDuration : undefined}
                className="h-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {downloadHref && status === 'complete' ? (
            <Button asChild>
              <a href={downloadHref} download={fileName}>
                <Download className="size-4" aria-hidden />
                Download MP4
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleExport}
              disabled={!voiceText || requiresElevenLabs || isExporting}
            >
              {isExporting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Generate reel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
