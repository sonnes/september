'use client';

import { useEffect, useRef, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ChevronDown, Plus } from 'lucide-react';

import { useAccount } from '@/packages/account';
import { cn } from '@/packages/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/packages/ui/components/dropdown-menu';

import { useSpaces } from '../hooks/use-spaces';
import { createSpace } from '../mutations';

interface SpaceSwitchProps {
  /** The space currently open — its button is highlighted. */
  currentSpaceId: string;
}

/**
 * Segmented switch sitting above the editor (where the old board switch lived).
 * One button per space, the current one highlighted; a trailing button creates a
 * new space. When the row no longer fits its container it collapses into a
 * dropdown instead of scrolling horizontally.
 */
export function SpaceSwitch({ currentSpaceId }: SpaceSwitchProps) {
  const navigate = useNavigate();
  const { user } = useAccount();
  const { spaces } = useSpaces({ userId: user?.id });

  const rowRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  // The row stays mounted (transparent when compact) so it can be measured:
  // its content overflows its box exactly when it no longer fits.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const check = () => setCompact(row.scrollWidth > row.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(row);
    return () => ro.disconnect();
  }, [spaces.length]);

  if (spaces.length === 0) return null;

  const open = (id: string) => navigate({ to: '/talk/$id', params: { id } });

  const handleNew = async () => {
    if (!user?.id) return;
    const space = await createSpace(user.id);
    navigate({ to: '/talk/$id', params: { id: space.id } });
  };

  const current = spaces.find(s => s.id === currentSpaceId);

  return (
    <div className="relative w-full">
      <div
        ref={rowRef}
        role="group"
        aria-label="Switch space"
        aria-hidden={compact}
        className={cn(
          'flex items-center gap-1 overflow-hidden rounded-md border bg-card p-0.5',
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
              onClick={() => open(space.id)}
              className={cn(
                'h-8 shrink-0 whitespace-nowrap rounded px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
          className="flex h-8 shrink-0 items-center gap-1 rounded px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="flex h-full w-full items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{current?.title || 'Untitled'}</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-48">
              <DropdownMenuRadioGroup value={currentSpaceId} onValueChange={open}>
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
  );
}
