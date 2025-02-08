'use client';

import { createContext, useContext, useState } from 'react';

export interface PlayMessage {
  id: string;
  text: string;
}

type PlayerContext = {
  playing?: PlayMessage;
  setPlaying: (message: PlayMessage) => void;
};

export const PlayerContext = createContext<PlayerContext | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState<PlayMessage | undefined>(undefined);

  return (
    <PlayerContext.Provider value={{ playing, setPlaying }}>{children}</PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error(`usePlayer must be used within a Player Context Provider.`);
  }
  return context;
};
