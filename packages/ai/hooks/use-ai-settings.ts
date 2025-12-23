'use client';

import { useContext } from 'react';

import { AISettingsContext } from '../components/context';

export function useAISettings() {
  const context = useContext(AISettingsContext);
  if (context === undefined) {
    throw new Error('useAISettings must be used within an AISettingsProvider');
  }
  return context;
}
