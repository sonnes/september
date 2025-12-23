'use client';

import { useCallback, useState } from 'react';

export interface UseKeyboardInteractionsReturn {
  hoveredKey: string | null;
  setHoveredKey: (key: string | null) => void;
  onHoverEnter: (key: string) => void;
  onHoverLeave: () => void;
}

export function useKeyboardInteractions(): UseKeyboardInteractionsReturn {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const onHoverEnter = useCallback((key: string) => {
    setHoveredKey(key);
  }, []);

  const onHoverLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  return {
    hoveredKey,
    setHoveredKey,
    onHoverEnter,
    onHoverLeave,
  };
}
