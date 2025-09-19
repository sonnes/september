'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  /** Animation speed in milliseconds per word (default: 300ms) */
  speed?: number;
  /** Custom class name for the container */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export default function AnimatedText({
  text,
  speed = 300,
  className = '',
  onComplete,
}: AnimatedTextProps) {
  const [visibleWords, setVisibleWords] = useState<number>(0);

  // Split text into words
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);

  // Start animation when component mounts or text changes
  useEffect(() => {
    if (words.length === 0) return;

    setVisibleWords(0);

    let currentWord = 0;
    const interval = setInterval(() => {
      currentWord++;
      setVisibleWords(currentWord);

      if (currentWord >= words.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete, words.length]);

  return (
    <div className={cn('inline-flex flex-wrap gap-x-2 gap-y-1', className)}>
      {words.map((word, index) => {
        const isVisible = index < visibleWords;

        return (
          <span
            key={index}
            className={cn(
              'inline-block pr-4 transition-opacity duration-200 ease-out',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
