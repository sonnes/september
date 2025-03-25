import { CircularKeyboard } from '../keyboard/circular';
import { KeyboardProps, KeyboardType } from '../keyboard/types';

type KeyboardSelectorProps = {
  activeKeyboard: KeyboardType;
  setActiveKeyboard: (type: KeyboardType) => void;
};

const ABCKeys = {
  top: {
    inner: ['q', 'w'],
    middle: ['e', 'r', 't', 'y', 'u'],
    outer: ['i', 'o', 'p', 'a', 's', 'd', 'f'],
  },
  bottom: {
    inner: ['g', 'h'],
    middle: ['j', 'k', 'l', 'z', 'x'],
    outer: ['c', 'v', 'b', 'n', 'm', ',', '.'],
  },
};

const NumberKeys = {
  top: {
    inner: ['1', '2'],
    middle: ['3', '4', '5', '6', '7'],
    outer: ['8', '9', '0', '.', '-', '=', '+'],
  },
  bottom: {
    inner: ['3', '4'],
    middle: ['5', '6', '7', '8', '9'],
    outer: ['0', '.', '-', '=', '+'],
  },
};

const EmojiKeys = {
  top: {
    inner: ['😀', '😃'],
    middle: ['😄', '😁', '😆', '😅', '😂'],
    outer: ['😊', '😉', '😍', '😘', '😚', '😙', '😗'],
  },
  bottom: {
    inner: ['😀', '😃'],
    middle: ['😄', '😁', '😆', '😅', '😂'],
    outer: ['😊', '😉', '😍', '😘', '😚', '😙', '😗'],
  },
};

const ControlKeys = ['⇧', '←', 'space', '→', '⌫'];

export function ABCKeyboard({ onKeyPress }: KeyboardProps) {
  return (
    <CircularKeyboard
      onKeyPress={onKeyPress}
      topKeys={ABCKeys.top}
      bottomKeys={ABCKeys.bottom}
      controlKeys={ControlKeys}
    />
  );
}

export function NumberKeyboard({ onKeyPress }: KeyboardProps) {
  return (
    <CircularKeyboard
      onKeyPress={onKeyPress}
      topKeys={NumberKeys.top}
      bottomKeys={NumberKeys.bottom}
      controlKeys={ControlKeys}
    />
  );
}

export function EmojiKeyboard({ onKeyPress }: KeyboardProps) {
  return (
    <CircularKeyboard
      onKeyPress={onKeyPress}
      topKeys={EmojiKeys.top}
      bottomKeys={EmojiKeys.bottom}
      controlKeys={ControlKeys}
    />
  );
}

export function KeyboardSelector({ activeKeyboard, setActiveKeyboard }: KeyboardSelectorProps) {
  const keyboards = [
    { type: 'abc', icon: 'abc', label: 'ABC Keyboard', onClick: () => setActiveKeyboard('abc') },
    {
      type: 'numbers',
      icon: '123',
      label: 'Numbers & Symbols',
      onClick: () => setActiveKeyboard('numbers'),
    },
    { type: 'emojis', icon: '😎', label: 'Emojis', onClick: () => setActiveKeyboard('emojis') },
    { type: 'qwerty', icon: 'qwerty', label: 'Qwerty', onClick: () => setActiveKeyboard('qwerty') },
  ];

  return (
    <div className="flex flex-col gap-2 items-center">
      {activeKeyboard && (
        <button
          onClick={() => setActiveKeyboard(null)}
          className="p-2 text-sm font-semibold text-red-500 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          x
        </button>
      )}
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
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs text-white bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {keyboard.label}
          </div>
        </div>
      ))}
    </div>
  );
}
