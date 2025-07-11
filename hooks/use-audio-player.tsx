'use client';

import React, { ReactNode, createContext, useCallback, useContext, useRef, useState } from 'react';

import { Audio } from '@/types/audio';

// Context value type
interface AudioPlayerContextType {
  queue: Audio[];
  current: Audio | null;
  isPlaying: boolean;
  play: (track: Audio) => void;
  enqueue: (track: Audio) => void;
  pause: () => void;
  resume: () => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Audio[]>([]);
  const [current, setCurrent] = useState<Audio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play a specific track immediately
  const play = useCallback((track: Audio) => {
    setCurrent(track);
    setIsPlaying(true);
    if (audioRef.current) {
      const src = `data:audio/mp3;base64,${track.blob}`;
      audioRef.current.src = src;
      audioRef.current.play();
    }
  }, []);

  // Enqueue a track (if nothing playing, play immediately)
  const enqueue = useCallback(
    (track: Audio) => {
      setQueue(prev => {
        if (!current && prev.length === 0) {
          setCurrent(track);
          setIsPlaying(true);
          if (audioRef.current) {
            const src = `data:audio/mp3;base64,${track.blob}`;
            audioRef.current.src = src;
            audioRef.current.play();
          }
          return prev;
        }
        return [...prev, track];
      });
    },
    [current]
  );

  // Play next track in queue
  const playNext = useCallback(() => {
    setQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setCurrent(next);
        setIsPlaying(true);
        if (audioRef.current) {
          const src = `data:audio/mp3;base64,${next.blob}`;
          audioRef.current.src = src;
          audioRef.current.play();
        }
        return rest;
      } else {
        setCurrent(null);
        setIsPlaying(false);
        return [];
      }
    });
  }, []);

  // Pause playback
  const pause = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Resume playback
  const resume = useCallback(() => {
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  // Clear queue and stop
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrent(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  // Handle audio end event
  const handleEnded = () => {
    playNext();
  };

  // Attach event listener to audio element
  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', handleEnded);
      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioRef, playNext]);

  // Sync audio element src when current changes
  React.useEffect(() => {
    if (audioRef.current && current) {
      const src = `data:audio/mp3;base64,${current.blob}`;
      audioRef.current.src = src;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [current, isPlaying]);

  const value: AudioPlayerContextType = {
    queue,
    current,
    isPlaying,
    play,
    enqueue,
    pause,
    resume,
    clearQueue,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
