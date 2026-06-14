'use client';

import { useNavigate } from '@tanstack/react-router';

import { Plus } from 'lucide-react';

import { useAccount } from '@/packages/account';
import { cn } from '@/packages/shared';

import { useSpaces } from '../hooks/use-spaces';
import { createSpace } from '../mutations';

interface SpaceSwitchProps {
  /** The space currently open — its button is highlighted. */
  currentSpaceId: string;
}

/**
 * Segmented switch sitting above the editor (where the old board switch lived).
 * One button per space, the current one highlighted; a trailing button creates a
 * new space. The row scrolls horizontally so it degrades gracefully with many
 * spaces.
 */
export function SpaceSwitch({ currentSpaceId }: SpaceSwitchProps) {
  const navigate = useNavigate();
  const { user } = useAccount();
  const { spaces } = useSpaces({ userId: user?.id });

  if (spaces.length === 0) return null;

  const handleNew = async () => {
    if (!user?.id) return;
    const space = await createSpace(user.id);
    navigate({ to: '/talk/$id', params: { id: space.id } });
  };

  return (
    <div
      role="group"
      aria-label="Switch space"
      className="flex items-center gap-1 overflow-x-auto rounded-md border bg-card p-0.5"
    >
      {spaces.map(space => {
        const isActive = space.id === currentSpaceId;
        return (
          <button
            key={space.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => navigate({ to: '/talk/$id', params: { id: space.id } })}
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
        onClick={handleNew}
        className="flex h-8 shrink-0 items-center gap-1 rounded px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden />
        New
      </button>
    </div>
  );
}
