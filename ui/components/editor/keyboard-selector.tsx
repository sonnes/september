import { KeyboardType } from '../keyboard/types';

type KeyboardSelectorProps = {
  activeKeyboard: KeyboardType;
  setActiveKeyboard: (type: KeyboardType) => void;
};

const keyboards = [
  { type: 'abc', icon: '⌨️', label: 'ABC Keyboard' },
  { type: 'numbers', icon: '🔢', label: 'Number Pad' },
  { type: 'symbols', icon: '🔣', label: 'Symbols' },
] as const;

export default function KeyboardSelector({
  activeKeyboard,
  setActiveKeyboard,
}: KeyboardSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
        onClick={() => setActiveKeyboard(null)}
      >
        X
      </button>
      {keyboards.map(keyboard => (
        <div key={keyboard.type} className="relative group">
          <button
            onClick={() =>
              setActiveKeyboard(activeKeyboard === keyboard.type ? null : keyboard.type)
            }
            className={`p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
              activeKeyboard === keyboard.type ? 'bg-zinc-200 dark:bg-zinc-600' : ''
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
