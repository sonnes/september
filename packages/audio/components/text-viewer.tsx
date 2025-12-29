'use client';

import { type HTMLAttributes, type ReactNode, createContext, useContext, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/packages/audio/components/audio-player';
import { Alignment } from '@/packages/audio/types';

import {
  type GapSegment,
  type TextSegment,
  type TextWord,
  type UseTextViewerResult,
  type WordStatus,
  useTextViewer,
} from '../hooks/use-text-viewer';

// Context for sharing text viewer state
interface TextViewerContextValue extends UseTextViewerResult {
  seek: (time: number) => void;
  isPlaying: boolean;
}

const TextViewerContext = createContext<TextViewerContextValue | null>(null);

function useTextViewerContext() {
  const context = useContext(TextViewerContext);
  if (!context) {
    throw new Error('useTextViewerContext must be used within a TextViewer');
  }
  return context;
}

// Main container component
interface TextViewerProps extends HTMLAttributes<HTMLDivElement> {
  alignment: Alignment;
  children?: ReactNode;
}

function TextViewer({ alignment, children, className, ...props }: TextViewerProps) {
  const { currentTime, duration, seek, isPlaying } = useAudioPlayer();

  const viewerState = useTextViewer({
    alignment,
    currentTime,
    duration,
  });

  const contextValue = useMemo(
    () => ({
      ...viewerState,
      seek,
      isPlaying,
    }),
    [viewerState, seek, isPlaying]
  );

  return (
    <TextViewerContext.Provider value={contextValue}>
      <div
        data-slot="text-viewer-root"
        className={cn('bg-muted/50 rounded-lg p-4 space-y-4 border border-border/50', className)}
        {...props}
      >
        {children}
      </div>
    </TextViewerContext.Provider>
  );
}

// Word component with status-based styling
interface TextViewerWordProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  word: TextWord;
  status: WordStatus;
  children?: ReactNode;
}

function TextViewerWord({ word, status, className, children, ...props }: TextViewerWordProps) {
  return (
    <span
      data-slot="text-word"
      data-kind="word"
      data-status={status}
      className={cn(
        // Consistent padding on all states to prevent layout shift
        'px-1.5 rounded-sm transition-colors duration-150 will-change-[background-color,color]',
        status === 'spoken' && 'text-foreground',
        status === 'unspoken' && 'text-muted-foreground',
        status === 'current' && 'bg-black text-white',
        className
      )}
      {...props}
    >
      {children ?? word.text}
    </span>
  );
}

// Words container with auto-rendering
interface TextViewerWordsProps extends HTMLAttributes<HTMLDivElement> {
  renderWord?: (props: { word: TextWord; status: WordStatus }) => ReactNode;
  renderGap?: (props: { segment: GapSegment; status: WordStatus }) => ReactNode;
  wordClassName?: string;
  gapClassName?: string;
}

function TextViewerWords({
  className,
  renderWord,
  renderGap,
  wordClassName,
  gapClassName,
  ...props
}: TextViewerWordsProps) {
  const { spokenSegments, unspokenSegments, currentWord, segments, seek, seekToWord } =
    useTextViewerContext();

  const segmentsWithStatus = useMemo(() => {
    const entries: Array<{ segment: TextSegment; status: WordStatus }> = [];

    for (const segment of spokenSegments) {
      entries.push({ segment, status: 'spoken' });
    }

    if (currentWord) {
      entries.push({ segment: currentWord, status: 'current' });
    }

    for (const segment of unspokenSegments) {
      entries.push({ segment, status: 'unspoken' });
    }

    // If no current word and no spoken/unspoken, show all as unspoken
    if (entries.length === 0 && segments.length > 0) {
      for (const segment of segments) {
        entries.push({ segment, status: 'unspoken' });
      }
    }

    return entries;
  }, [spokenSegments, unspokenSegments, currentWord, segments]);

  const handleWordClick = (word: TextWord) => {
    const time = seekToWord(word);
    seek(time);
  };

  return (
    <div
      data-slot="text-words"
      className={cn('text-base leading-relaxed text-muted-foreground', className)}
      {...props}
    >
      {segmentsWithStatus.map(({ segment, status }) => {
        if (segment.kind === 'gap') {
          const content = renderGap ? renderGap({ segment, status }) : segment.text;
          return (
            <span
              key={`gap-${segment.segmentIndex}`}
              data-kind="gap"
              data-status={status}
              className={cn(gapClassName)}
            >
              {content}
            </span>
          );
        }

        if (renderWord) {
          return (
            <span
              key={`word-${segment.segmentIndex}`}
              data-kind="word"
              data-status={status}
              className={cn('cursor-pointer', wordClassName)}
              onClick={() => handleWordClick(segment)}
            >
              {renderWord({ word: segment, status })}
            </span>
          );
        }

        return (
          <TextViewerWord
            key={`word-${segment.segmentIndex}`}
            word={segment}
            status={status}
            className={cn('cursor-pointer', wordClassName)}
            onClick={() => handleWordClick(segment)}
          />
        );
      })}
    </div>
  );
}
export { TextViewer, TextViewerWords, TextViewerWord, useTextViewerContext };
export type { TextViewerProps, TextViewerWordsProps, TextViewerWordProps, WordStatus };
