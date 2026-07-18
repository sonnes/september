'use client';

import { useEffect, useRef, useState } from 'react';

import { FileText, MoreHorizontal, Plus, Sparkles } from 'lucide-react';

import { cn, timeAgo } from '@/packages/shared';

import type { Note } from '../types';

interface NoteTabsProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (note: Note) => void;
  onCreate: () => void;
  isCreating?: boolean;
  /** Whether the space's "About" note is the active surface. */
  aboutActive?: boolean;
  /** Select the space's "About" note (bound to the space context). */
  onSelectAbout?: () => void;
  className?: string;
}

/**
 * The Notes working-set strip — the slot pinned phrase rows occupy in Talk.
 * A row of note tabs sits directly above the composer; when the tabs no longer
 * fit, the row collapses into an "All notes" overflow list showing each note's
 * title and last-updated time.
 */
export function NoteTabs({
  notes,
  selectedId,
  onSelect,
  onCreate,
  isCreating,
  aboutActive,
  onSelectAbout,
  className,
}: NoteTabsProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // Measured overflow — the row overflows its box exactly when it no longer
  // fits, at which point tabs collapse into the "All notes" list.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const check = () => setCompact(row.scrollWidth > row.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(row);
    return () => ro.disconnect();
  }, [notes.length]);

  useEffect(() => {
    if (!listOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setListOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setListOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [listOpen]);

  const selected = notes.find(n => n.id === selectedId) ?? notes[0];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        Notes
      </span>

      {onSelectAbout && (
        <button
          type="button"
          role="tab"
          aria-current={aboutActive ? 'true' : undefined}
          aria-selected={aboutActive}
          onClick={onSelectAbout}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            aboutActive
              ? 'border-primary/50 bg-accent text-accent-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Sparkles className="size-4 shrink-0" aria-hidden />
          About
        </button>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={rowRef}
          role="tablist"
          aria-label="Notes"
          aria-hidden={compact}
          className={cn(
            'flex items-center gap-1.5 overflow-hidden',
            compact && 'pointer-events-none opacity-0'
          )}
        >
          {notes.map(n => {
            const isActive = !aboutActive && n.id === selected?.id;
            return (
              <button
                key={n.id}
                type="button"
                role="tab"
                tabIndex={compact ? -1 : undefined}
                aria-current={isActive ? 'true' : undefined}
                aria-selected={isActive}
                onClick={() => onSelect(n)}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-primary/50 bg-accent text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="max-w-40 truncate">{n.name || 'Untitled note'}</span>
              </button>
            );
          })}
        </div>

        {compact && (
          <div ref={moreRef} className="absolute inset-y-0 left-0">
            <button
              type="button"
              aria-label="All notes"
              aria-haspopup="menu"
              aria-expanded={listOpen}
              onClick={() => setListOpen(open => !open)}
              className="flex h-full min-h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="size-4 shrink-0" aria-hidden />
              <span className="max-w-40 truncate">{selected?.name || 'Untitled note'}</span>
              <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            {listOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 z-50 mb-2 max-h-80 w-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
              >
                {notes.map(n => {
                  const isActive = !aboutActive && n.id === selected?.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => {
                        onSelect(n);
                        setListOpen(false);
                      }}
                      className={cn(
                        'flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent',
                        isActive && 'bg-accent'
                      )}
                    >
                      <span className="line-clamp-1 text-sm font-medium">
                        {n.name || 'Untitled note'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Updated {timeAgo(n.updated_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-dashed border-primary/40 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden />
        New note
      </button>
    </div>
  );
}
