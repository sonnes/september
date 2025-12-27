'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCustomKeyboard } from '../hooks/use-custom-keyboard';
import { GridButton } from '../types';

interface CustomKeyboardProps {
  keyboardId: string;
  className?: string;
  onKeyPress: (key: string) => void;
}

export function CustomKeyboard({
  keyboardId,
  className = '',
  onKeyPress
}: CustomKeyboardProps) {
  const { keyboard, isLoading, error } = useCustomKeyboard(keyboardId);

  if (isLoading) {
    return <div className={cn('p-4 text-center', className)}>Loading keyboard...</div>;
  }

  if (error || !keyboard) {
    return <div className={cn('p-4 text-center text-red-600', className)}>
      {error?.message || 'Keyboard not found'}
    </div>;
  }

  // Sort buttons by order
  const sortedButtons = [...keyboard.buttons].sort((a, b) => a.order - b.order);

  // Use inline styles for true responsive grid columns
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.min(keyboard.columns, 3)}, minmax(0, 1fr))`,
    gap: '0.375rem',
    padding: '0.75rem',
  };

  const handleButtonClick = (button: GridButton) => {
    const value = button.value || button.text;
    onKeyPress(value);
  };

  return (
    <div className={cn('bg-white border-t border-zinc-200', className)}>
      <div className="max-w-4xl mx-auto">
        {/* Keyboard title */}
        <div className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-medium">
          {keyboard.name}
        </div>

        {/* Grid buttons */}
        <div style={gridStyle}>
          {sortedButtons.map(button => (
            <Button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              variant="outline"
              size="sm"
              className={cn(
                'h-12 px-2 py-1',
                'flex flex-col items-center justify-center',
                'text-xs font-medium',
                'whitespace-normal',
                'hover:bg-zinc-100 active:bg-zinc-200'
              )}
            >
              {button.image_url && (
                <Image
                  src={button.image_url}
                  alt={button.text}
                  width={20}
                  height={20}
                  className="mb-0.5 object-contain"
                />
              )}
              <span className="text-center break-words line-clamp-2">{button.text}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
