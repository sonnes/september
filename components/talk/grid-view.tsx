import React from 'react';

import type { Grid, GridButton } from '@/types/grid';

interface GridViewProps {
  grid: Grid;
  onButtonClick: (button: GridButton) => void;
}

export const GridView: React.FC<GridViewProps> = ({ grid, onButtonClick }) => {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">{grid.name}</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {grid.buttons.map(button => (
          <button
            key={button.id}
            className="p-2 rounded shadow bg-white hover:bg-gray-100 border flex flex-col items-center min-w-0 min-h-0"
            style={{ fontSize: '0.75rem', lineHeight: 1.1 }}
            onClick={() => onButtonClick(button)}
          >
            {button.image_url && (
              <img src={button.image_url} alt={button.text} className="w-6 h-6 mb-1" />
            )}
            <span className="font-medium truncate w-full text-xs text-center">{button.text}</span>
            {button.type !== 'default' && (
              <span className="text-[10px] mt-0.5 text-gray-500">{button.type}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
