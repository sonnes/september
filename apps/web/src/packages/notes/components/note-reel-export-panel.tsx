'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Download, Loader2, Play } from 'lucide-react';
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
  reelTimingSupported,
  wordsToReelCaptions,
} from '../lib/reel';
import { renderNoteReelVideoWithWasm } from '../lib/reel-renderer.browser';
import { DEFAULT_PAIR_KEY, REEL_PAIRS, reelPair, type ReelPairKey } from '../lib/reel-theme';
import type { Note } from '../types';
import { NoteReelStoryPlayer } from './note-reel-story-player';

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
  const [showPlayer, setShowPlayer] = useState(false);
  const [pairKey, setPairKey] = useState<ReelPairKey>(DEFAULT_PAIR_KEY);

  const isExporting = status === 'generating-audio' || status === 'rendering-video';
  const requiresTimedVoice = !reelTimingSupported(speechConfig.provider);
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

    if (requiresTimedVoice) {
      toast.error('Select an ElevenLabs or Kokoro voice before exporting a reel.');
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
        throw new Error('Voice timing is required for reel export.');
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
        pairKey,
      });

      setDownloadHref(URL.createObjectURL(result.blob));
      setStatus('complete');
      toast.success('Reel ready');
    } catch (err) {
      setStatus('idle');
      toast.error(err instanceof Error ? err.message : 'Failed to export reel');
    }
  }, [downloadHref, generateSpeech, note, pairKey, requiresTimedVoice, voiceText]);

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

      {requiresTimedVoice && (
        <Callout tone="warning" title="Timed voice required" className="mt-3">
          Reel export needs word timing. Select an ElevenLabs or Kokoro voice in speech settings,
          then try again.
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
          <div
            className={`aspect-[9/16] overflow-hidden rounded-lg border text-background ${reelPair(pairKey).bgClass}`}
          >
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

      <div className="mt-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Colour</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reel colour">
          {REEL_PAIRS.map(pair => (
            <button
              key={pair.key}
              type="button"
              role="radio"
              aria-checked={pairKey === pair.key}
              aria-label={pair.name}
              onClick={() => setPairKey(pair.key)}
              className={`flex size-11 items-center justify-center rounded-full transition-all ${
                pairKey === pair.key ? 'ring-2 ring-ring ring-offset-2' : ''
              }`}
            >
              <span
                className="size-7 rounded-full border border-black/10"
                style={{
                  background: `linear-gradient(135deg, ${pair.bg} 50%, ${pair.display} 50%)`,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => setShowPlayer(true)}
          disabled={!voiceText || requiresTimedVoice || isExporting}
        >
          <Play className="size-4" aria-hidden />
          Play
        </Button>

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
            disabled={!voiceText || requiresTimedVoice || isExporting}
          >
            {isExporting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Generate reel
          </Button>
        )}
      </div>

      {showPlayer && (
        <NoteReelStoryPlayer
          voiceText={voiceText}
          pairKey={pairKey}
          onClose={() => setShowPlayer(false)}
        />
      )}
    </section>
  );
}
