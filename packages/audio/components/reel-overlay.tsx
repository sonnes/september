'use client';

import { type HTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@september/shared/lib/utils';

import { useTextViewerContext, TextViewer as TextViewerComponent } from './text-viewer';
import { usePretextLayout } from '../hooks/use-pretext-layout';
import type { Alignment } from '../types';
import type { WordStatus } from '../hooks/use-text-viewer';

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
  fontWeight?: string;
  getWordStatus?: (wordIndex: number) => WordStatus | 'shown';
}

function ReelRenderer({
  text,
  fontFamily = '"Noto Sans"',
  fontWeight = '700',
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

  const { fontSize, lines, totalHeight } = usePretextLayout({
    text,
    containerWidth: dimensions.width,
    containerHeight: dimensions.height,
    fontFamily,
    fontWeight,
  });

  const lineHeight = fontSize > 0 ? Math.round(fontSize * 1.2) : 0;

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
  const padding = 48;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      {...props}
    >
      {fontSize > 0 && (
        <div
          className="absolute inset-x-0 flex flex-col gap-2"
          style={{ top: topOffset, paddingLeft: padding, paddingRight: padding }}
        >
          {lineWords.map((words, lineIdx) => (
            <div
              key={lineIdx}
              className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2"
            >
              <p
                style={{
                  fontSize,
                  lineHeight: `${lineHeight}px`,
                  fontFamily,
                  fontWeight: Number(fontWeight),
                }}
                className="text-white m-0"
              >
                {words.map((word, i) => {
                  if (word.isSpace) return word.text;

                  const status = getWordStatus?.(word.wordIndex) ?? 'shown';
                  const isUnspoken = status === 'unspoken';
                  const isCurrent = status === 'current';

                  return (
                    <span
                      key={`${lineIdx}-${i}`}
                      data-status={status}
                      className={cn(
                        'inline transition-all duration-200 ease-out',
                        isUnspoken && 'opacity-0',
                        isCurrent && 'bg-white/20 rounded-md px-1 -mx-1',
                        !isUnspoken && 'opacity-100',
                      )}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </p>
            </div>
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

// ─── ReelTextViewer (convenience wrapper) ──────────────────────

interface ReelTextViewerProps extends HTMLAttributes<HTMLDivElement> {
  text: string;
  alignment?: Alignment;
  fontFamily?: string;
  fontWeight?: string;
}

function ReelTextViewer({
  text,
  alignment,
  fontFamily,
  fontWeight,
  className,
  ...props
}: ReelTextViewerProps) {
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

export { ReelOverlay, ReelRenderer, ReelTextViewer };
export type { ReelOverlayProps, ReelTextViewerProps };
