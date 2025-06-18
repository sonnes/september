import React from 'react';

import { KeyboardProps } from './types';

interface KeyProps {
  value: string;
  width?: string;
  onClick?: (value: string) => void;
}

const Key: React.FC<KeyProps> = ({ value, width = '40px', onClick }) => (
  <button
    className="h-10 rounded bg-gray-100 font-medium hover:bg-gray-200 active:bg-gray-300"
    style={{ width }}
    onClick={() => onClick?.(value)}
  >
    {value}
  </button>
);

export const QwertyKeyboard: React.FC<KeyboardProps> = ({ onKeyPress }) => {
  const rows = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['Caps Lock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
    ['Ctrl', 'Alt', 'Space', 'Alt', 'Ctrl'],
  ];

  const getKeyWidth = (key: string): string => {
    switch (key) {
      case 'Backspace':
        return '80px';
      case 'Tab':
      case 'Caps Lock':
      case 'Enter':
        return '70px';
      case 'Shift':
        return '90px';
      case 'Space':
        return '400px';
      case 'Ctrl':
      case 'Alt':
        return '60px';
      default:
        return '40px';
    }
  };

  return (
    <div className="inline-block rounded-lg bg-gray-50 p-2 shadow-lg">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="mb-1 flex gap-1">
          {row.map((key, keyIndex) => (
            <Key
              key={`${rowIndex}-${keyIndex}`}
              value={key}
              width={getKeyWidth(key)}
              onClick={onKeyPress}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
