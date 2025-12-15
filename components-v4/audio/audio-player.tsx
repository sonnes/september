'use client';

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  AudioPlayerProvider as AudioPlayerProviderBase,
  useAudioPlayerContext,
} from 'react-use-audio-player';

import { Audio as AudioTrack } from '@/types/audio';

// Context value type
interface AudioPlayerContextType {
  isPlaying: boolean;
  enqueue: (track: AudioTrack) => void;
  togglePlayPause: () => void;
  current: AudioTrack | null;
  isMuted: boolean;
  toggleMute: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  return (
    <AudioPlayerProviderBase>
      <AudioPlayerQueueProvider>{children}</AudioPlayerQueueProvider>
    </AudioPlayerProviderBase>
  );
}

function AudioPlayerQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  const { load, play, pause, isPlaying } = useAudioPlayerContext();
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (queue.length > 0 && queue[currentIndex]) {
      const track = queue[currentIndex];

      if (track.utterance) {
        track.utterance.onend = () => {
          if (currentIndex < queue.length - 1) {
            setCurrentIndex(idx => idx + 1);
          } else {
            setQueue([]);
            setCurrentIndex(0);
          }
        };

        synthesis?.speak(track.utterance);
        return;
      }

      if (track.blob) {
        const blob = queue[currentIndex].blob;

        const src = blob?.startsWith('data:') ? blob : `data:audio/mp3;base64,${blob}`;
        load(src, {
          autoplay: true,
          onend: () => {
            // When the track ends, move to the next one
            if (currentIndex < queue.length - 1) {
              setCurrentIndex(idx => idx + 1);
            } else {
              // Optionally, clear the queue or reset index
              setQueue([]);
              setCurrentIndex(0);
            }
          },
        });
      }
    }
  }, [queue, currentIndex, load, synthesis]);

  // Enqueue a new track
  const enqueue = useCallback(
    (track: AudioTrack) => {
      setQueue(prev => {
        if (isMuted) {
          return prev;
        }

        // If nothing is playing, start with this track
        if (prev.length === 0) {
          setCurrentIndex(0);
          return [track];
        }
        return [...prev, track];
      });
    },
    [isMuted]
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const value: AudioPlayerContextType = {
    isPlaying,
    enqueue,
    togglePlayPause,
    current: queue[currentIndex] || null,
    isMuted,
    toggleMute,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
