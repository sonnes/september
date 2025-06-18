import { useState } from 'react';

import { CircularKeyboard } from '../keyboard/circular-v2';
import { QwertyKeyboard } from '../keyboard/qwerty';
import { KeyboardProps, KeyboardType } from '../keyboard/types';

type KeyboardSelectorProps = {
  activeKeyboard: KeyboardType;
  setActiveKeyboard: (type: KeyboardType) => void;
};
export function KeyboardSelector({ activeKeyboard, setActiveKeyboard }: KeyboardSelectorProps) {
  const keyboards = [
    {
      type: 'none',
      icon: 'x',
      label: 'None',
      onClick: () => setActiveKeyboard(null),
    },
    {
      type: 'circular',
      icon: 'circular',
      label: 'Circular',
      onClick: () => setActiveKeyboard('circular'),
    },

    { type: 'emojis', icon: 'emojis', label: 'Emojis', onClick: () => setActiveKeyboard('emojis') },
    { type: 'qwerty', icon: 'qwerty', label: 'Qwerty', onClick: () => setActiveKeyboard('qwerty') },
  ];

  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      {keyboards.map(keyboard => (
        <div key={keyboard.type} className="relative group">
          <button
            onClick={keyboard.onClick}
            className={`p-2 text-sm font-semibold text-zinc-500 rounded-lg hover:bg-zinc-100 transition-colors ${
              activeKeyboard === keyboard.type ? 'bg-zinc-200' : ''
            }`}
          >
            {keyboard.icon}
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {keyboard.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Keyboard({ onKeyPress }: KeyboardProps) {
  const [activeKeyboard, setActiveKeyboard] = useState<KeyboardType>(null);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {activeKeyboard && (
        <div className="w-full flex justify-center">
          {activeKeyboard === 'circular' ? (
            <CircularKeyboard onKeyPress={onKeyPress} />
          ) : activeKeyboard === 'qwerty' ? (
            <QwertyKeyboard onKeyPress={onKeyPress} />
          ) : null}
        </div>
      )}

      <div className="flex-shrink-0">
        <KeyboardSelector activeKeyboard={activeKeyboard} setActiveKeyboard={setActiveKeyboard} />
      </div>
    </div>
  );
}
