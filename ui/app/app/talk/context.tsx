'use client';

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { Voice } from '@/types/speech';

export const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];

export interface TalkSettings {
  model_id: string;
  speed: number;
  stability: number;
  similarity: number;
  style: number;
  speaker_boost: boolean;
}

interface SettingsContextType {
  settings: TalkSettings;
  updateSetting: <K extends keyof TalkSettings>(key: K, value: TalkSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  defaultSettings,
  children,
}: {
  defaultSettings: TalkSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<TalkSettings>(defaultSettings);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('talkSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse settings from localStorage:', error);
      }
    }
  }, []);

  // Update a single setting
  const updateSetting = <K extends keyof TalkSettings>(key: K, value: TalkSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('talkSettings', JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use the settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
