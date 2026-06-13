'use client';

import { type ReactNode } from 'react';

import { Loader2, LayoutGrid } from 'lucide-react';

import { cn } from '@/packages/shared';

import { useStripes } from '../hooks/use-stripes';
import { SuggestionStripes } from './suggestion-stripes';

interface SuggestionsProps {
  chatId?: string;
  className?: string;
  /** Word-level autocomplete row, rendered between the stripes and the scan toggle. */
  wordSuggestions?: ReactNode;
  /** Called when the user pins a phrase to the space context md. */
  onPin?: (phrase: string) => void;
}

/**
 * Self-contained suggestions surface: stripe tiles, pinned word chips, and
 * scan-mode toggle. Driven by useStripes (which reads the editor text from
 * useEditorContext internally).
 *
 * Public API: <Suggestions chatId={chatId} className="…" onPin={handlePin} />
 */
export function Suggestions({ chatId, className, wordSuggestions, onPin }: SuggestionsProps) {
  const {
    stripes,
    pinnedChips,
    scanMode,
    setScanMode,
  } = useStripes({ chatId });

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
          scanMode={scanMode}
          onPin={onPin}
        />
      )}

      {/* Word-level autocomplete — sits above the scan toggle */}
      {wordSuggestions}

      {/* Scan-mode toggle — steps through stripe tiles and pinned chips */}
      {hasContent && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScanMode(!scanMode)}
            aria-pressed={scanMode}
            title={scanMode ? 'Exit scan mode' : 'Enable scan mode'}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              scanMode
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <LayoutGrid className="size-4" aria-hidden />
            Scan
          </button>
        </div>
      )}
    </div>
  );
}
