'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

import { ReelRenderer, type WordStatus } from '@/packages/audio';

import { useSlideVoiceOver } from '../hooks/use-slide-voice-over';
import { activeCaptionIndex, alignmentToReelWords, captionProgress, wordsToReelCaptions } from '../lib/reel';
import {
  captionRoles,
  DEFAULT_PAIR_KEY,
  ensureReelFonts,
  REEL_GRAIN_SVG,
  REEL_VIGNETTE_GRADIENT,
  reelPair,
  type ReelPairKey,
  roleColors,
  ROLE_SPECS,
  SPOKEN_OPACITY,
  UNSPOKEN_OPACITY,
  WATERMARK_TEXT,
} from '../lib/reel-theme';

interface NoteReelStoryPlayerProps {
  voiceText: string;
  pairKey?: ReelPairKey;
  onClose: () => void;
}

/**
 * Plays a note reel like an Instagram story: fullscreen 9:16, one caption chunk
 * at a time with a segmented progress bar, synced to the spoken audio. Tap
 * zones (and arrow keys) skip chunks; tap-center / Space pauses; Esc closes.
 * The look — editorial serif display over solid Tailwind colour with film grain
 * and vignette — is shared with the MP4 exporter via `reel-theme`.
 */
export function NoteReelStoryPlayer({
  voiceText,
  pairKey = DEFAULT_PAIR_KEY,
  onClose,
}: NoteReelStoryPlayerProps) {
  const { speak, stop, seek, pause, resume, isPlaying, isGenerating, alignment, currentTime } =
    useSlideVoiceOver();

  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureReelFonts().then(() => {
      if (active) setFontsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    speak(voiceText, onClose);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceText]);

  const captions = useMemo(
    () => (alignment ? wordsToReelCaptions(alignmentToReelWords(alignment)) : []),
    [alignment]
  );
  const roles = useMemo(() => captionRoles(captions), [captions]);

  const activeIndex = activeCaptionIndex(captions, currentTime);
  const activeCaption = captions[activeIndex];
  const activeRole = roles[activeIndex] ?? 'display';

  const pair = reelPair(pairKey);
  const spec = ROLE_SPECS[activeRole];
  const colors = roleColors(pair, activeRole);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
      <div
        className={`@container relative aspect-[9/16] h-full max-h-screen overflow-hidden ${pair.bgClass}`}
      >
        {/* Film grain + soft vignette — the same texture the MP4 export bakes in. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `${REEL_VIGNETTE_GRADIENT}, url("${REEL_GRAIN_SVG}")`,
          }}
        />

        {/* Segmented progress — one thin segment per caption */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {captions.map((caption, index) => {
            const fill =
              index < activeIndex ? 1 : index === activeIndex ? captionProgress(caption, currentTime) : 0;
            return (
              <div key={index} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full bg-white/90" style={{ width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-6 z-30 flex size-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          <XMarkIcon className="size-6" />
        </button>

        {isGenerating || !captions.length || !fontsReady ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/70" aria-hidden />
          </div>
        ) : (
          <div
            key={activeIndex}
            className="absolute inset-0 z-10"
            style={
              prefersReducedMotion ? undefined : { animation: 'reel-rise 0.42s cubic-bezier(.16,1,.3,1)' }
            }
          >
            <ReelRenderer
              text={captionText}
              getWordStatus={getWordStatus}
              fontFamily={spec.fontFamily}
              fontWeight={spec.fontWeight}
              lineHeightRatio={spec.lineHeightRatio}
              maxFontRatio={spec.maxFontRatio}
              boxHeightRatio={spec.boxHeightRatio}
              color={colors.base}
              activeColor={colors.active}
              spokenOpacity={SPOKEN_OPACITY}
              unspokenOpacity={UNSPOKEN_OPACITY}
            />
          </div>
        )}

        {/* Watermark, bottom-left — shared position ratio with the exporter. */}
        <div
          className="absolute z-20 flex items-center gap-2 font-semibold tracking-wide text-white/85"
          style={{ left: '5%', bottom: '3.1%', fontSize: 'clamp(11px, 3.47cqw, 22px)' }}
        >
          {WATERMARK_TEXT}
        </div>

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

      <style>{`
        @keyframes reel-rise {
          from { transform: translateY(14px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
