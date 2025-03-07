'use client';

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5' },
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2 (English Only)' },
];
export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  use_case?: string;
  age?: string;
  gender?: string;
  accent?: string;
  language?: string;
}

export interface TalkSettings {
  voice: Voice;
  model_id: string;
  speed: number;
  stability: number;
  similarity: number;
  style: number;
  speaker_boost: boolean;
}

// Default settings
export const defaultSettings: TalkSettings = {
  voice: {
    voice_id: 'rachel',
    name: 'Rachel',
  },
  model_id: 'eleven_multilingual_v2',
  speed: 0.5,
  stability: 0.5,
  similarity: 0.75,
  style: 0.0,
  speaker_boost: false,
};

interface SettingsContextType {
  settings: TalkSettings;
  updateSetting: <K extends keyof TalkSettings>(key: K, value: TalkSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
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

  // Reset to default settings
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('talkSettings', JSON.stringify(defaultSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
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
