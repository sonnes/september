'use client';

import React from 'react';

import { useTextContext } from '@/components/context/text-provider';

interface QwertyKeyboardProps {
  className?: string;
}

export function QwertyKeyboard({ className = '' }: QwertyKeyboardProps) {
  const { text, setText } = useTextContext();

  const handleKeyPress = (key: string) => {
    if (key === 'BACKSPACE') {
      setText(text.slice(0, -1));
    } else if (key === 'ENTER') {
      setText(text + '\n');
    } else if (key === 'SPACE') {
      setText(text + ' ');
    } else if (/^[0-9]$/.test(key)) {
      // Numbers should be added as-is
      setText(text + key);
    } else {
      // Letters should be lowercase
      setText(text + key.toLowerCase());
    }
  };

  const keyRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'BACKSPACE'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
    ['Z', 'X', 'C', 'SPACE', 'V', 'B', 'N', 'M'],
  ];

  const getKeyWidth = (key: string) => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return 'w-16 sm:w-20'; // Wider for special keys
    }
    if (key === 'SPACE') {
      return 'w-24 sm:w-26'; // Extra wide for space bar
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
        {keyRows.map((row, rowIndex) => (
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
    </div>
  );
}
