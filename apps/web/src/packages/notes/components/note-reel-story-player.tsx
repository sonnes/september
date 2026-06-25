'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

import { ReelRenderer, type WordStatus } from '@/packages/audio';

import { useSlideVoiceOver } from '../hooks/use-slide-voice-over';
import { activeCaptionIndex, alignmentToReelWords, captionProgress, wordsToReelCaptions } from '../lib/reel';

interface NoteReelStoryPlayerProps {
  voiceText: string;
  onClose: () => void;
}

/**
 * Plays a note reel like an Instagram story: fullscreen 9:16, one caption chunk
 * at a time with a segmented progress bar, synced to the spoken audio. Tap
 * zones (and arrow keys) skip chunks; tap-center / Space pauses; Esc closes.
 */
export function NoteReelStoryPlayer({ voiceText, onClose }: NoteReelStoryPlayerProps) {
  const { speak, stop, seek, pause, resume, isPlaying, isGenerating, alignment, currentTime } =
    useSlideVoiceOver();

  useEffect(() => {
    speak(voiceText, onClose);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceText]);

  const captions = useMemo(
    () => (alignment ? wordsToReelCaptions(alignmentToReelWords(alignment)) : []),
    [alignment]
  );

  const activeIndex = activeCaptionIndex(captions, currentTime);
  const activeCaption = captions[activeIndex];

  const goPrev = useCallback(() => {
    const target = captions[Math.max(0, activeIndex - 1)];
    if (target) seek(target.startTime);
  }, [captions, activeIndex, seek]);

  const goNext = useCallback(() => {
    const target = captions[activeIndex + 1];
    if (target) seek(target.startTime);
    else onClose();
  }, [captions, activeIndex, seek, onClose]);

  const togglePause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goNext();
          break;
        case ' ':
          event.preventDefault();
          togglePause();
          break;
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, togglePause, onClose]);

  const getWordStatus = useCallback(
    (wordIndex: number): WordStatus | 'shown' => {
      const word = activeCaption?.words[wordIndex];
      if (!word) return 'shown';
      if (currentTime > word.endTime) return 'spoken';
      if (currentTime >= word.startTime) return 'current';
      return 'unspoken';
    },
    [activeCaption, currentTime]
  );

  const captionText = activeCaption?.words.map(word => word.text).join(' ') ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative aspect-[9/16] h-full max-h-screen overflow-hidden bg-zinc-900 text-white">
        {/* Segmented progress — one segment per caption */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {captions.map((caption, index) => {
            const fill =
              index < activeIndex ? 1 : index === activeIndex ? captionProgress(caption, currentTime) : 0;
            return (
              <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div className="h-full bg-white" style={{ width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-6 z-30 flex size-11 items-center justify-center rounded-full bg-black/40 text-white"
        >
          <XMarkIcon className="size-6" />
        </button>

        {isGenerating || !captions.length ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/70" aria-hidden />
          </div>
        ) : (
          <ReelRenderer text={captionText} getWordStatus={getWordStatus} className="text-white" />
        )}

        {/* Tap zones: prev / pause / next */}
        <div className="absolute inset-0 z-10 flex">
          <button type="button" aria-label="Previous caption" className="h-full w-1/3" onClick={goPrev} />
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="h-full w-1/3"
            onClick={togglePause}
          />
          <button type="button" aria-label="Next caption" className="h-full w-1/3" onClick={goNext} />
        </div>
      </div>
    </div>
  );
}
