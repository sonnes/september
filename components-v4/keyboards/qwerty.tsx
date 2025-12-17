'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface QwertyKeyboardProps {
  className?: string;
  onKeyPress: (key: string) => void;
}

export function QwertyKeyboard({ className = '', onKeyPress }: QwertyKeyboardProps) {
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);

  const handleKeyPress = (key: string) => {
    if (key !== 'SHIFT') {
      setIsShiftPressed(false);
    }

    if (key === 'SHIFT') {
      setIsShiftPressed(!isShiftPressed);
    } else if (key === 'BACKSPACE' || key === 'ENTER' || key === 'SPACE' || /^[0-9]$/.test(key)) {
      // Special keys and numbers pass through as-is
      onKeyPress(key);
    } else {
      // Letter keys - transform based on SHIFT state
      const transformedKey = isShiftPressed ? key.toUpperCase() : key.toLowerCase();
      onKeyPress(transformedKey);
    }
  };

  const keyRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'BACKSPACE'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '?'],
    ['😀', 'SPACE', 'SHIFT'],
  ];

  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  // Numpad layout for medium screens and up
  const numpadRows = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0']];

  const getKeyWidth = (key: string) => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return 'w-16 sm:w-20'; // Wider for special keys
    }
    if (key === 'SPACE' || key === 'SHIFT') {
      return 'w-16 sm:w-20'; // Wider for special keys
    }
    return 'w-8 sm:w-10'; // Standard width for letter keys
  };

  const getKeyContent = (key: string) => {
    if (key === 'BACKSPACE') {
      return (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
          />
        </svg>
      );
    }
    return key;
  };

  return (
    <div className={`bg-white mt-2 border-t border-zinc-200 p-2 sm:p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Mobile layout - traditional QWERTY with number row */}
        <div className="md:hidden">
          {[numberRow, ...keyRows].map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              {row.map(key => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={`
                    ${getKeyWidth(key)}
                    h-10 sm:h-12
                    flex items-center justify-center
                    bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300
                    border border-zinc-300 rounded-md
                    text-sm sm:text-base font-medium text-zinc-800
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    select-none
                  `}
                  type="button"
                >
                  {getKeyContent(key)}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Desktop layout - QWERTY with separate numpad */}
        <div className="hidden md:flex gap-4">
          {/* Main QWERTY keyboard */}
          <div className="flex-1">
            {keyRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2 mb-2">
                {row.map(key => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      getKeyWidth(key),
                      `h-12`,
                      `flex items-center justify-center`,
                      isShiftPressed && key === 'SHIFT'
                        ? `bg-zinc-200`
                        : `bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300`,
                      `border border-zinc-300 rounded-md`,
                      `text-base font-medium text-zinc-800`,
                      `transition-colors duration-150`,
                      `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`,
                      `select-none`
                    )}
                    type="button"
                  >
                    {getKeyContent(key)}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Numpad */}
          <div className="w-32">
            {numpadRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2 mb-2">
                {row.map(key => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      `w-12`,
                      `h-12`,
                      `flex items-center justify-center`,
                      `bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300`,
                      `border border-zinc-300 rounded-md`,
                      `text-base font-medium text-zinc-800`,
                      `transition-colors duration-150`,
                      `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`,
                      `select-none`
                    )}
                    type="button"
                  >
                    {getKeyContent(key)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
