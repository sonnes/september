'use client';

import { createContext, useContext } from 'react';

import { type Theme } from '@/lib/theme';

type ThemeContext = {
  theme: Theme;
};

export const ThemeContext = createContext<ThemeContext | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
