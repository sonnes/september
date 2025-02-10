'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { createClient } from '@/supabase/client';

export interface PlayMessage {
  id: string;
  text: string;
}

type PlayerContext = {
  playing?: PlayMessage;
  audio?: HTMLAudioElement;
  setPlaying: (message: PlayMessage) => void;
};

export const PlayerContext = createContext<PlayerContext | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState<PlayMessage | undefined>(undefined);
  const [audio, setAudio] = useState<HTMLAudioElement | undefined>(undefined);

  useEffect(() => {
    if (!playing) return;

    fetchAudio(playing.id).then(setAudio);
  }, [playing]);

  return (
    <PlayerContext.Provider value={{ playing, setPlaying, audio }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error(`usePlayer must be used within a Player Context Provider.`);
  }
  return context;
};

const fetchAudio = async (id: string) => {
  const supabase = createClient();

  const { data, error } = await supabase.storage.from('speech').download(`${id}.mp3`);

  if (error) {
    throw new Error('Error downloading audio:', error);
  }

  if (!data) {
    return;
  }

  const audio = new Audio(URL.createObjectURL(data));

  return audio;
};
