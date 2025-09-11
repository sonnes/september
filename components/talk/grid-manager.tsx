'use client';

import React from 'react';

import defaultGrid from '@/data/default-grid.json';
import { useText } from '@/hooks/use-text';
import type { Grid, GridButton } from '@/types/grid';

import { GridView } from './grid-view';

export const GridManager: React.FC = () => {
  const grid = defaultGrid as Grid;
  const { addWord } = useText();

  const handleButtonClick = (button: GridButton) => {
    if (button.type === 'default' && button.text) {
      addWord(button.text);
    }
  };

  return (
    <div>
      <GridView grid={grid} onButtonClick={handleButtonClick} />
    </div>
  );
};
