'use client';

import { type ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

import { cn } from '@/packages/shared';

import { useStripes } from '../hooks/use-stripes';
import { SuggestionStripes } from './suggestion-stripes';

interface SuggestionsProps {
  chatId?: string;
  className?: string;
  /** Word-level autocomplete row, rendered below the stripes. */
  wordSuggestions?: ReactNode;
  /** Called when the user pins a phrase to the space context md. */
  onPin?: (phrase: string) => void;
  /** Accept a whole stripe (full draft + suggestion) and speak it. */
  onSubmit?: (text: string) => void;
}

/**
 * Self-contained suggestions surface: stripe tiles and pinned word chips.
 * Driven by useStripes (which reads the editor text from useEditorContext
 * internally).
 *
 * Public API: <Suggestions chatId={chatId} className="…" onPin={handlePin} />
 */
export function Suggestions({ chatId, className, wordSuggestions, onPin, onSubmit }: SuggestionsProps) {
  const { stripes, pinnedChips } = useStripes({ chatId });

  const isLoading = false; // LLM loading state surfaced through useSuggestions inside useStripes

  const hasContent = stripes.length > 0 || pinnedChips.length > 0;

  if (!hasContent && !wordSuggestions) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding suggestions...</span>
        </div>
      )}

      {hasContent && (
        <SuggestionStripes
          stripes={stripes}
          pinnedChips={pinnedChips}
          onPin={onPin}
          onSubmit={onSubmit}
        />
      )}

      {/* Word-level autocomplete */}
      {wordSuggestions}
    </div>
  );
}
