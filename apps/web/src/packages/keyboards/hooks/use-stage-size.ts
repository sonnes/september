'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

export interface StageSize {
  width: number;
  height: number;
}

export interface UseStageSizeReturn {
  stageSize: StageSize;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isMounted: boolean;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useStageSize(): UseStageSizeReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
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
    };
  }, []);

  return { stageSize, containerRef, isMounted };
}
