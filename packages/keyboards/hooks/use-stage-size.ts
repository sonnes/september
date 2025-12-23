'use client';

import { useEffect, useRef, useState } from 'react';

export interface StageSize {
  width: number;
  height: number;
}

export interface UseStageSizeReturn {
  stageSize: StageSize;
  containerRef: React.RefObject<HTMLDivElement>;
  isMounted: boolean;
}

export function useStageSize(): UseStageSizeReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      setIsMounted(false);
    };
  }, []);

  return { stageSize, containerRef, isMounted };
}
