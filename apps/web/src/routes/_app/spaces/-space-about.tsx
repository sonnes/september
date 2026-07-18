'use client';

import { useRef } from 'react';

import { TiptapEditor } from '@/packages/editor';
import { cn } from '@/packages/shared';
import { updateSpace, useSpaces } from '@/packages/spaces';

interface SpaceAboutProps {
  spaceId: string;
  className?: string;
}

/**
 * The space's "About" note — an editor bound to the space's `context` field.
 * Context used to be a right-panel tab; it now lives as the first tab in the
 * notes sub-dock. The content still seeds this space's suggestions and AI
 * phrases (read from `space.context` in `use-stripes`), so editing here feeds
 * Talk. Autosaves on a short debounce, like the old context tab did.
 */
export function SpaceAbout({ spaceId, className }: SpaceAboutProps) {
  const { spaces } = useSpaces();
  const space = spaces.find(s => s.id === spaceId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdate = (_html: string, markdown: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSpace(spaceId, { context: markdown }).catch(err => {
        console.error('Failed to save context:', err);
      });
    }, 500);
  };

  return (
    <section className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div>
        <h2 className="text-lg font-semibold">About this space</h2>
        <p className="text-xs text-muted-foreground">
          Guides this space's suggestions and phrases. Bullet lines (- like this) become phrase
          ideas.
        </p>
      </div>
      <TiptapEditor
        content={space?.context ?? ''}
        placeholder="- I need some water&#10;- Can you help me"
        onUpdate={handleUpdate}
        className="min-h-0 flex-1"
      />
    </section>
  );
}
