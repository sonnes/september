'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAISettings } from '@/packages/ai';
import { type Alignment, ReelTextViewer } from '@/packages/audio';
import { useSpeech } from '@/packages/speech';
import { Button } from '@/packages/ui/components/button';
import { Callout } from '@/packages/ui/components/callout';
import { Progress } from '@/packages/ui/components/progress';

import {
  alignmentToReelWords,
  audioDataUri,
  markdownToVoiceText,
  wordsToReelCaptions,
} from '../lib/reel';
import { renderNoteReelVideoWithWasm } from '../lib/reel-renderer.browser';
import type { Note } from '../types';

type ExportStatus = 'idle' | 'generating-audio' | 'rendering-video' | 'complete';

interface NoteReelExportPanelProps {
  id: string;
  note: Note | undefined;
  voiceText: string;
}

const STATUS_META: Record<ExportStatus, { progress: number; label: string }> = {
  idle: { progress: 0, label: 'Ready to export' },
  'generating-audio': { progress: 35, label: 'Generating voice timing' },
  'rendering-video': { progress: 75, label: 'Rendering MP4' },
  complete: { progress: 100, label: 'Reel ready' },
};

function reelFileName(noteName?: string): string {
  const base = (noteName || 'note')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'note'}-reel.mp4`;
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

export function NoteReelExportPanel({ id, note, voiceText }: NoteReelExportPanelProps) {
  const { generateSpeech } = useSpeech();
  const { speechConfig } = useAISettings();
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [downloadHref, setDownloadHref] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ alignment: Alignment; duration: number } | null>(null);

  const isExporting = status === 'generating-audio' || status === 'rendering-video';
  const requiresElevenLabs = speechConfig.provider !== 'elevenlabs';
  const fileName = useMemo(() => reelFileName(note?.name), [note?.name]);
  const previewText = useMemo(
    () => voiceText || markdownToVoiceText(note?.content ?? ''),
    [voiceText, note?.content]
  );
  const wordCount = useMemo(() => (previewText ? previewText.split(/\s+/).length : 0), [previewText]);

  useEffect(() => {
    return () => {
      if (downloadHref) URL.revokeObjectURL(downloadHref);
    };
  }, [downloadHref]);

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

    if (downloadHref) URL.revokeObjectURL(downloadHref);
    setDownloadHref(null);

    try {
      setStatus('generating-audio');
      const speech = await speechPromise;

      if (!speech.blob || !speech.alignment) {
        throw new Error('ElevenLabs voice timing is required for reel export.');
      }

      const src = audioDataUri(speech.blob);
      const durationSeconds = await audioDurationSeconds(src);
      const words = alignmentToReelWords(speech.alignment);
      const captions = wordsToReelCaptions(words);

      if (!captions.length) {
        throw new Error('No caption timing was generated.');
      }

      setPreview({ alignment: speech.alignment, duration: durationSeconds });
      setStatus('rendering-video');

      const result = await renderNoteReelVideoWithWasm({
        audioDataUri: src,
        captions,
        durationSeconds,
      });

      setDownloadHref(URL.createObjectURL(result.blob));
      setStatus('complete');
      toast.success('Reel ready');
    } catch (err) {
      setStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Failed to export reel');
    }
  }, [downloadHref, generateSpeech, note, requiresElevenLabs, voiceText]);

  return (
    <section id={id} aria-label="Reel export" className="mt-3 border-t pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Reel export</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {previewText ? `${wordCount} words` : 'No note text'}
          </div>
        </div>
        <div className="shrink-0 text-xs font-medium text-muted-foreground">
          {STATUS_META[status].label}
        </div>
      </div>

      {requiresElevenLabs && (
        <Callout tone="warning" title="ElevenLabs voice required" className="mt-3">
          Reel export needs word timing from ElevenLabs. Select an ElevenLabs voice in speech
          settings, then try again.
        </Callout>
      )}

      <div className="mt-3 flex gap-3">
        <div className="min-w-0 flex-1">
          <Progress value={STATUS_META[status].progress} />
          <div className="mt-3 text-sm">
            <div className="font-medium">Download file</div>
            <div className="mt-1 break-all text-muted-foreground">{fileName}</div>
          </div>
        </div>

        <div className="w-24 shrink-0">
          <div className="aspect-[9/16] overflow-hidden rounded-lg border bg-foreground text-background">
            <ReelTextViewer
              text={previewText || 'No note text'}
              alignment={preview?.alignment}
              currentTime={preview ? Math.min(preview.duration / 2, 3) : undefined}
              duration={preview?.duration}
              className="h-full"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        {downloadHref && status === 'complete' ? (
          <Button asChild size="lg">
            <a href={downloadHref} download={fileName}>
              <Download className="size-4" aria-hidden />
              Download MP4
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={handleExport}
            disabled={!voiceText || requiresElevenLabs || isExporting}
          >
            {isExporting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Generate reel
          </Button>
        )}
      </div>
    </section>
  );
}
