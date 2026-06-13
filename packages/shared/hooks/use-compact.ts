'use client';

import * as React from 'react';

/**
 * The base design viewport: a 13" iPad Pro (M4) in landscape, 1376px wide.
 * Primary designs target this size. At or below it the app shell runs compact
 * (the sidebar collapses to an icon rail); wider screens get the full layout.
 */
export const BASE_VIEWPORT_WIDTH = 1376;

/** Is a viewport width at or below the base design viewport? */
export const isCompactWidth = (width: number) => width <= BASE_VIEWPORT_WIDTH;

export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BASE_VIEWPORT_WIDTH}px)`);
    const onChange = () => setIsCompact(isCompactWidth(window.innerWidth));
    mql.addEventListener('change', onChange);
    setIsCompact(isCompactWidth(window.innerWidth));
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isCompact;
}
