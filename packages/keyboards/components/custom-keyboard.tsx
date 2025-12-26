'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
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
    gap: '0.5rem',
    padding: '1rem',
  };

  const handleButtonClick = (button: GridButton) => {
    const value = button.value || button.text;
    onKeyPress(value);
  };

  return (
    <div className={cn('bg-white border-t border-zinc-200', className)}>
      <div className="max-w-4xl mx-auto">
        {/* Keyboard title */}
        <div className="px-4 pt-2 text-sm text-muted-foreground">
          {keyboard.name}
        </div>

        {/* Grid buttons */}
        <div style={gridStyle}>
          {sortedButtons.map(button => (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button)}
              className={cn(
                'min-h-16 p-2',
                'flex flex-col items-center justify-center',
                'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300',
                'border border-zinc-300 rounded-md',
                'text-sm font-medium text-zinc-800',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'select-none'
              )}
              type="button"
            >
              {button.image_url && (
                <Image
                  src={button.image_url}
                  alt={button.text}
                  width={32}
                  height={32}
                  className="mb-1 object-contain"
                />
              )}
              <span className="text-center break-words">{button.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
