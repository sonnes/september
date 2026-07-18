'use client';

import { useEffect, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, FileText, MessagesSquare, Plus } from 'lucide-react';

import { useAccount } from '@/packages/account';
import { cn, entitySlug } from '@/packages/shared';
import { createSpace, useSpaces } from '@/packages/spaces';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/packages/ui/components/dropdown-menu';

import { type SpaceMode } from '@/routes/_app/spaces/-space-mode';

import { ModeGroup, type ModeOption } from './mode-group';

const MODES: ModeOption<SpaceMode>[] = [
  { key: 'talk', label: 'Talk', icon: MessagesSquare },
  { key: 'notes', label: 'Notes', icon: FileText },
];

interface SpaceDockProps {
  /** The space currently open — its tab is highlighted. */
  currentSpaceId: string;
  mode: SpaceMode;
  onModeChange: (mode: SpaceMode) => void;
}

/**
 * The bottom navigation dock, present in every mode. Space tabs sit on the
 * left (collapsing to a dropdown when they no longer fit, like the old
 * SpaceSwitch), the mode group sits on the right, with a deliberate gap so
 * imprecise input can't cross-hit between the two control groups.
 */
export function SpaceDock({ currentSpaceId, mode, onModeChange }: SpaceDockProps) {
  const navigate = useNavigate();
  const { user } = useAccount();
  const { spaces } = useSpaces({ userId: user?.id });

  const rowRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  // The tab row stays mounted (transparent when compact) so it can be
  // measured: its content overflows its box exactly when it no longer fits.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const check = () => setCompact(row.scrollWidth > row.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(row);
    return () => ro.disconnect();
  }, [spaces.length]);

  const openSpace = (id: string) => {
    const space = spaces.find(s => s.id === id);
    navigate({
      to: '/spaces/$spaceSlug',
      params: { spaceSlug: entitySlug(space?.title, 'space') },
    });
  };

  const handleNew = async () => {
    if (!user?.id) return;
    const space = await createSpace(user.id);
    navigate({
      to: '/spaces/$spaceSlug',
      params: { spaceSlug: entitySlug(space.title, 'space') },
    });
  };

  const current = spaces.find(s => s.id === currentSpaceId);

  return (
    <div className="flex shrink-0 items-center gap-2 border-t bg-muted/40 px-4 py-2.5">
      {spaces.length > 0 && (
        <div className="relative min-w-0 flex-1">
          <div
            ref={rowRef}
            role="group"
            aria-label="Switch space"
            aria-hidden={compact}
            className={cn(
              'flex items-center gap-1.5 overflow-hidden',
              compact && 'pointer-events-none opacity-0'
            )}
          >
            {spaces.map(space => {
              const isActive = space.id === currentSpaceId;
              return (
                <button
                  key={space.id}
                  type="button"
                  tabIndex={compact ? -1 : undefined}
                  aria-pressed={isActive}
                  onClick={() => openSpace(space.id)}
                  className={cn(
                    'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {space.title || 'Untitled'}
                </button>
              );
            })}

            <button
              type="button"
              tabIndex={compact ? -1 : undefined}
              onClick={handleNew}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-dashed border-primary/40 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" aria-hidden />
              New
            </button>
          </div>

          {compact && (
            <div className="absolute inset-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Switch space"
                    className="flex h-full min-h-11 w-full items-center justify-between gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">{current?.title || 'Untitled'}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-48"
                >
                  <DropdownMenuRadioGroup value={currentSpaceId} onValueChange={openSpace}>
                    {spaces.map(space => (
                      <DropdownMenuRadioItem key={space.id} value={space.id}>
                        <span className="truncate">{space.title || 'Untitled'}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleNew()}>
                    <Plus className="size-4" aria-hidden />
                    New space
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      <div className="ml-auto shrink-0 pl-5">
        <ModeGroup modes={MODES} value={mode} onChange={onModeChange} />
      </div>
    </div>
  );
}
