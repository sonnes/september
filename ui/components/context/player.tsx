'use client';

import { createContext, useContext, useState } from 'react';

export interface PlayMessage {
  id: string;
  text: string;
}

type PlayerContext = {
  playing: boolean;
  playMessage?: PlayMessage;
  setPlayMessage: (message: PlayMessage) => void;
};

export const PlayerContext = createContext<PlayerContext | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error(`usePlayer must be used within a Player Context Provider.`);
  }
  return context;
};
