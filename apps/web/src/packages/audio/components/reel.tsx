'use client';

import { type HTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/packages/shared';

import { useTextViewerContext, TextViewer as TextViewerComponent } from './text-viewer';
import { defaultPretextPadding, usePretextLayout } from '../hooks/use-pretext-layout';
import type { Alignment } from '../types';
import { useTextViewer, type WordStatus } from '../hooks/use-text-viewer';

// ─── Types ─────────────────────────────────────────────────────

interface LineWord {
  text: string;
  wordIndex: number;
  isSpace: boolean;
}

// ─── Shared layout renderer ───────────────────────────────────

interface ReelRendererProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Line height as a fraction of font size. */
  lineHeightRatio?: number;
  /** Cap the fitted font at this fraction of the container width. */
  maxFontRatio?: number;
  /** Fit the caption within this fraction of the container height. */
  boxHeightRatio?: number;
  /** Base word colour (hex). Defaults to the inherited `currentColor`. */
  color?: string;
  /** Active (currently spoken) word colour. Defaults to `color`. */
  activeColor?: string;
  /** Opacity for already-spoken words. */
  spokenOpacity?: number;
  /** Opacity for not-yet-spoken words. */
  unspokenOpacity?: number;
  getWordStatus?: (wordIndex: number) => WordStatus | 'shown';
}

function ReelRenderer({
  text,
  fontFamily = '"Noto Sans"',
  fontWeight = '700',
  lineHeightRatio = 1.2,
  maxFontRatio,
  boxHeightRatio,
  color,
  activeColor,
  spokenOpacity = 0.55,
  unspokenOpacity = 0.88,
  getWordStatus,
  className,
  ...props
}: ReelRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const w = Math.round(width);
      const h = Math.round(height);
      setDimensions(prev =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Padding is derived from the full frame so it matches the canvas exporter,
  // which sizes its side padding off the same width/height.
  const padding = defaultPretextPadding(dimensions.width, dimensions.height);
  const layoutHeight = boxHeightRatio
    ? Math.round(dimensions.height * boxHeightRatio)
    : dimensions.height;

  const { fontSize, lines, totalHeight } = usePretextLayout({
    text,
    containerWidth: dimensions.width,
    containerHeight: layoutHeight,
    fontFamily,
    fontWeight: String(fontWeight),
    lineHeightRatio,
    maxFontSize:
      maxFontRatio && dimensions.width ? Math.round(dimensions.width * maxFontRatio) : undefined,
    padding,
    // Captions are drawn without pill backgrounds, so no per-line extra padding.
    lineExtraPx: 0,
    lineGapPx: 0,
  });

  const lineHeight = fontSize > 0 ? Math.round(fontSize * lineHeightRatio) : 0;

  // Split each line into words with global word indices
  const lineWords = useMemo((): LineWord[][] => {
    if (!lines.length) return [];

    let wordIndex = 0;
    return lines.map(line => {
      const parts = line.text.split(/(\s+)/);
      const words: LineWord[] = [];

      for (const part of parts) {
        if (!part) continue;
        const isSpace = /^\s+$/.test(part);
        words.push({
          text: part,
          wordIndex: isSpace ? -1 : wordIndex++,
          isSpace,
        });
      }

      return words;
    });
  }, [lines]);

  const topOffset = Math.max(0, (dimensions.height - totalHeight) / 2);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      {...props}
    >
      {fontSize > 0 && (
        <div
          className="absolute inset-x-0 flex flex-col text-center"
          style={{ top: topOffset, paddingLeft: padding, paddingRight: padding }}
        >
          {lineWords.map((words, lineIdx) => (
            <p
              key={lineIdx}
              style={{
                fontSize,
                lineHeight: `${lineHeight}px`,
                fontFamily,
                fontWeight: Number(fontWeight),
                textShadow: '0 2px 14px rgba(0,0,0,0.35)',
              }}
              className="m-0"
            >
              {words.map((word, i) => {
                if (word.isSpace) return word.text;

                const status = getWordStatus?.(word.wordIndex) ?? 'shown';
                const isCurrent = status === 'current';
                const wordColor = isCurrent ? (activeColor ?? color) : color;
                const opacity =
                  status === 'spoken'
                    ? spokenOpacity
                    : status === 'unspoken'
                      ? unspokenOpacity
                      : 1;

                return (
                  <span
                    key={`${lineIdx}-${i}`}
                    data-status={status}
                    className="inline transition-[color,opacity] duration-200 ease-out"
                    style={{ color: wordColor, opacity }}
                  >
                    {word.text}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ReelOverlay (used inside TextViewer) ──────────────────────

interface ReelOverlayProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  fontFamily?: string;
  fontWeight?: string;
}

function ReelOverlay({ text, fontFamily, fontWeight, ...props }: ReelOverlayProps) {
  const ctx = useTextViewerContext();

  const getWordStatus = useMemo(() => {
    const statusMap = new Map<number, WordStatus>();

    for (const seg of ctx.spokenSegments) {
      if (seg.kind === 'word') statusMap.set(seg.wordIndex, 'spoken');
    }
    if (ctx.currentWord) {
      statusMap.set(ctx.currentWord.wordIndex, 'current');
    }
    for (const seg of ctx.unspokenSegments) {
      if (seg.kind === 'word') statusMap.set(seg.wordIndex, 'unspoken');
    }

    return (wordIndex: number): WordStatus | 'shown' => statusMap.get(wordIndex) ?? 'shown';
  }, [ctx.spokenSegments, ctx.currentWord, ctx.unspokenSegments]);

  return (
    <ReelRenderer
      text={text}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      getWordStatus={getWordStatus}
      {...props}
    />
  );
}

// ─── ReelSyncOverlay (standalone — uses alignment + time directly) ──

interface ReelSyncOverlayProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  alignment: Alignment;
  currentTime: number;
  duration: number;
  fontFamily?: string;
  fontWeight?: string;
}

function ReelSyncOverlay({
  text,
  alignment,
  currentTime,
  duration,
  fontFamily,
  fontWeight,
  ...props
}: ReelSyncOverlayProps) {
  const { spokenSegments, currentWord, unspokenSegments } = useTextViewer({
    alignment,
    currentTime,
    duration,
  });

  const getWordStatus = useMemo(() => {
    const statusMap = new Map<number, WordStatus>();

    for (const seg of spokenSegments) {
      if (seg.kind === 'word') statusMap.set(seg.wordIndex, 'spoken');
    }
    if (currentWord) {
      statusMap.set(currentWord.wordIndex, 'current');
    }
    for (const seg of unspokenSegments) {
      if (seg.kind === 'word') statusMap.set(seg.wordIndex, 'unspoken');
    }

    return (wordIndex: number): WordStatus | 'shown' => statusMap.get(wordIndex) ?? 'shown';
  }, [spokenSegments, currentWord, unspokenSegments]);

  return (
    <ReelRenderer
      text={text}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      getWordStatus={getWordStatus}
      {...props}
    />
  );
}

// ─── ReelTextViewer (convenience wrapper) ──────────────────────

interface ReelTextViewerProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  alignment?: Alignment;
  /** Provide currentTime + duration to bypass AudioPlayer context (e.g. slides) */
  currentTime?: number;
  duration?: number;
  fontFamily?: string;
  fontWeight?: string;
}

function ReelTextViewer({
  text,
  alignment,
  currentTime,
  duration,
  fontFamily,
  fontWeight,
  className,
  ...props
}: ReelTextViewerProps) {
  // Direct sync mode — alignment + currentTime/duration provided externally
  if (alignment && currentTime !== undefined && duration !== undefined) {
    return (
      <ReelSyncOverlay
        text={text}
        alignment={alignment}
        currentTime={currentTime}
        duration={duration}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        className={className}
        {...props}
      />
    );
  }

  // Audio player mode — alignment provided, sync via useAudioPlayer context
  if (alignment) {
    return (
      <TextViewerComponent
        alignment={alignment}
        className={cn('bg-transparent border-0 p-0 space-y-0', className)}
        {...props}
      >
        <ReelOverlay text={text} fontFamily={fontFamily} fontWeight={fontWeight} />
      </TextViewerComponent>
    );
  }

  // Static mode — no audio sync
  return (
    <ReelRenderer
      text={text}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      className={className}
      {...props}
    />
  );
}

export { ReelOverlay, ReelRenderer, ReelSyncOverlay, ReelTextViewer };
export type { ReelOverlayProps, ReelSyncOverlayProps, ReelTextViewerProps };
