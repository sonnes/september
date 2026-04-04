'use client';

import { type HTMLAttributes, createContext, useContext, useMemo } from 'react';

import type { Alignment } from '@september/audio/types';
import { type TextSegment, type TextWord, type GapSegment, useTextViewer } from '@september/audio/hooks/use-text-viewer';
import { cn } from '@september/shared/lib/utils';

type WordStatus = 'spoken' | 'current' | 'unspoken';

interface SlideTextViewerContextValue {
  segments: TextSegment[];
  spokenSegments: TextSegment[];
  unspokenSegments: TextSegment[];
  currentWord: TextWord | null;
}

const SlideTextViewerContext = createContext<SlideTextViewerContextValue | null>(null);

function useSlideTextViewerContext() {
  const ctx = useContext(SlideTextViewerContext);
  if (!ctx) throw new Error('SlideTextViewerWords must be used inside SlideTextViewer');
  return ctx;
}

interface SlideTextViewerProps extends HTMLAttributes<HTMLDivElement> {
  alignment: Alignment;
  currentTime: number;
  duration: number;
}

export function SlideTextViewer({
  alignment,
  currentTime,
  duration,
  children,
  className,
  ...props
}: SlideTextViewerProps) {
  const { segments, spokenSegments, unspokenSegments, currentWord } = useTextViewer({
    alignment,
    currentTime,
    duration,
  });

  const value = useMemo(
    () => ({ segments, spokenSegments, unspokenSegments, currentWord }),
    [segments, spokenSegments, unspokenSegments, currentWord]
  );

  return (
    <SlideTextViewerContext.Provider value={value}>
      <div
        data-slot="slide-text-viewer"
        className={cn('rounded-lg bg-black/60 px-4 py-2 backdrop-blur-sm', className)}
        {...props}
      >
        {children}
      </div>
    </SlideTextViewerContext.Provider>
  );
}

export function SlideTextViewerWords({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { segments, spokenSegments, unspokenSegments, currentWord } = useSlideTextViewerContext();

  const segmentsWithStatus = useMemo<Array<{ segment: TextSegment; status: WordStatus }>>(() => {
    const result: Array<{ segment: TextSegment; status: WordStatus }> = [];
    for (const s of spokenSegments) result.push({ segment: s, status: 'spoken' });
    if (currentWord) result.push({ segment: currentWord, status: 'current' });
    for (const s of unspokenSegments) result.push({ segment: s, status: 'unspoken' });
    // Fallback: nothing spoken yet
    if (result.length === 0) {
      for (const s of segments) result.push({ segment: s, status: 'unspoken' });
    }
    return result;
  }, [segments, spokenSegments, unspokenSegments, currentWord]);

  return (
    <div
      data-slot="slide-text-words"
      className={cn('flex flex-wrap gap-x-1 text-sm leading-relaxed', className)}
      {...props}
    >
      {segmentsWithStatus.map(({ segment, status }) => (
        <span
          key={`${segment.kind}-${segment.segmentIndex}`}
          data-kind={segment.kind}
          data-status={status}
          className={cn(
            'rounded-sm px-0.5 transition-colors duration-150',
            status === 'spoken' && 'text-white/40',
            status === 'unspoken' && 'text-white/70',
            status === 'current' && 'bg-white font-medium text-black'
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
