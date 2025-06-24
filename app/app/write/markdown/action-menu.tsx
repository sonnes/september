import React from 'react';

interface ActionMenuProps {
  top: number;
  left: number;
  onPlay: () => void;
  isLoading: boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ top, left, onPlay, isLoading }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none', // Prevents blocking editor interaction
      }}
      className="block-action-menu"
    >
      <button
        onClick={onPlay}
        disabled={isLoading}
        className="pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg border border-zinc-200 hover:bg-blue-100 focus:bg-blue-200 focus:ring-2 focus:ring-blue-400 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Play block as speech"
        tabIndex={0}
      >
        {isLoading ? (
          <span
            className="inline-block w-5 h-5 border-2 border-zinc-200 border-t-blue-500 rounded-full animate-spin"
            aria-label="Loading..."
          />
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="11" cy="11" r="10" fill="#e0e7ef" />
            <polygon points="8,6 17,11 8,16" fill="#2563eb" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ActionMenu;
