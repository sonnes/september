'use client';

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AudioPlayerProvider as AudioPlayerProviderBase,
  useAudioPlayerContext,
} from 'react-use-audio-player';

// Type for an audio track (can be extended later)
export type AudioTrack = {
  blob: string; // URL or blob string
  alignment: any;
};

// Context value type
interface AudioPlayerContextType {
  isPlaying: boolean;
  enqueue: (track: AudioTrack) => void;
  togglePlayPause: () => void;
  current: AudioTrack | null;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  return (
    <AudioPlayerProviderBase>
      <AudioPlayerQueueProvider>{children}</AudioPlayerQueueProvider>
    </AudioPlayerProviderBase>
  );
}

// This is the actual queue logic provider
function AudioPlayerQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const { load, play, pause, isPlaying } = useAudioPlayerContext();

  // Play the current track when the queue or index changes
  useEffect(() => {
    if (queue.length > 0 && queue[currentIndex]) {
      const src = `data:audio/mp3;base64,${queue[currentIndex].blob}`;
      load(src, {
        autoplay: true,
        onend: () => {
          // When the track ends, move to the next one
          if (currentIndex < queue.length - 1) {
            setCurrentIndex(idx => idx + 1);
          } else {
            // Optionally, clear the queue or reset index
            // setQueue([]);
            // setCurrentIndex(0);
          }
        },
      });
    }
  }, [queue, currentIndex, load]);

  // Enqueue a new track
  const enqueue = useCallback((track: AudioTrack) => {
    setQueue(prev => {
      // If nothing is playing, start with this track
      if (prev.length === 0) {
        setCurrentIndex(0);
        return [track];
      }
      return [...prev, track];
    });
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const value: AudioPlayerContextType = {
    isPlaying,
    enqueue,
    togglePlayPause,
    current: queue[currentIndex] || null,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
