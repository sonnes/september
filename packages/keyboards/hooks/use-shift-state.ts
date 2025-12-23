'use client';

import { useCallback, useState } from 'react';

export interface UseShiftStateReturn {
  isShiftPressed: boolean;
  toggleShift: () => void;
  resetShift: () => void;
}

export function useShiftState(): UseShiftStateReturn {
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const toggleShift = useCallback(() => {
    setIsShiftPressed(prev => !prev);
  }, []);

  const resetShift = useCallback(() => {
    setIsShiftPressed(false);
  }, []);

  return { isShiftPressed, toggleShift, resetShift };
}
