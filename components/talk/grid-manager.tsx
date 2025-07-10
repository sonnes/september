'use client';

import React from 'react';

import defaultGrid from '@/data/default-grid.json';
import { useTextContext } from '@/hooks/use-text-context';
import type { Grid, GridButton } from '@/types/talk';

import { GridView } from './grid-view';

export const GridManager: React.FC = () => {
  const grid = defaultGrid as Grid;
  const { addWord } = useTextContext();

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
