'use client';

import { type ReactNode } from 'react';

import { Loader2, LayoutGrid } from 'lucide-react';

import { cn } from '@september/shared';
import { useEditorContext } from '@september/editor';
import { CustomKeyboard } from '@september/keyboards';

import { appendTokens } from '../lib/stripes';
import { useStripes } from '../hooks/use-stripes';
import { SuggestionStripes } from './suggestion-stripes';

interface SuggestionsProps {
  chatId?: string;
  className?: string;
  /** Word-level autocomplete row, rendered between the stripes and the board switches. */
  wordSuggestions?: ReactNode;
}

// ---------------------------------------------------------------------------
// BoardSelector — segmented control: General + named boards
// ---------------------------------------------------------------------------

interface BoardSelectorProps {
  boards: CustomKeyboard[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

function BoardSelector({ boards, activeId, onSelect, disabled }: BoardSelectorProps) {
  const options: { id: string | null; label: string }[] = [
    { id: null, label: 'General' },
    ...boards.map(b => ({ id: b.id, label: b.name })),
  ];

  if (boards.length === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card p-0.5" role="group">
      {options.map(opt => (
        <button
          key={opt.id ?? 'general'}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.id)}
          aria-pressed={activeId === opt.id}
          className={cn(
            'h-8 rounded px-3 text-sm font-medium transition-colors disabled:opacity-40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeId === opt.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardGrid — fixed scanning grid shown in board mode
// ---------------------------------------------------------------------------

interface BoardGridProps {
  board: CustomKeyboard;
  onSelect: (entry: string) => void;
}

function BoardGrid({ board, onSelect }: BoardGridProps) {
  const sortedButtons = [...board.buttons].sort((a, b) => a.order - b.order);
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${board.columns}, minmax(0, 1fr))` }}
    >
      {sortedButtons.map(btn => {
        const value = btn.value || btn.text;
        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => onSelect(value)}
            className="flex min-h-16 items-center justify-center rounded-md border bg-card px-3 py-3 text-center text-base font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {btn.text}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggestions — public surface
// ---------------------------------------------------------------------------

/**
 * Self-contained suggestions surface: board selector, board-mode toggle,
 * stripe tiles, and pinned word chips. Driven by useStripes (which reads
 * the editor text from useEditorContext internally).
 *
 * Public API: <Suggestions chatId={chatId} className="…" />
 */
export function Suggestions({ chatId, className, wordSuggestions }: SuggestionsProps) {
  const { text, setText } = useEditorContext();

  const {
    stripes,
    pinnedChips,
    boards,
    activeBoardId,
    setActiveBoardId,
    scanMode,
    setScanMode,
    activeBoard,
  } = useStripes({ chatId });

  const isLoading = false; // LLM loading state surfaced through useSuggestions inside useStripes

  /** Board-mode entry insertion: append the full entry text to the current editor text.
   * CRITICAL: Do NOT call trackKeystroke — see suggestion-stripes invariant. */
  const handleBoardEntry = (entry: string) => {
    setText(appendTokens(text, entry));
  };

  const hasContent = stripes.length > 0 || pinnedChips.length > 0;
  const hasBoards = boards.length > 0;

  if (!hasContent && !hasBoards && !wordSuggestions) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Suggestions: stripes, or the fixed scanning grid in board mode */}
      {scanMode && activeBoard ? (
        <BoardGrid board={activeBoard} onSelect={handleBoardEntry} />
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Finding suggestions...</span>
            </div>
          )}

          {hasContent && (
            <SuggestionStripes stripes={stripes} pinnedChips={pinnedChips} />
          )}
        </>
      )}

      {/* Word-level autocomplete — sits above the board switches */}
      {wordSuggestions}

      {/* Board selector + board-mode toggle — kept directly above the composer */}
      {hasBoards && (
        <div className="flex flex-wrap items-center gap-2">
          <BoardSelector
            boards={boards}
            activeId={activeBoardId}
            onSelect={id => {
              setActiveBoardId(id);
              setScanMode(false);
            }}
            disabled={scanMode}
          />
          {activeBoardId !== null && (
            <>
              <span className="h-5 w-px bg-border" aria-hidden />
              <button
                type="button"
                onClick={() => setScanMode(!scanMode)}
                aria-pressed={scanMode}
                title={scanMode ? 'Show suggestions' : 'Show board as a grid'}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  scanMode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <LayoutGrid className="size-4" aria-hidden />
                Grid
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
