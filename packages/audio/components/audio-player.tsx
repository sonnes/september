'use client';

import {
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

import { Audio as AudioTrack } from '@/packages/audio/types';

// Context value type
interface AudioPlayerContextType {
  isPlaying: boolean;
  enqueue: (track: AudioTrack) => void;
  togglePlayPause: () => void;
  current?: AudioTrack;
  isMuted: boolean;
  toggleMute: () => void;
  // Time tracking
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
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
  const [currentTime, setCurrentTime] = useState(0);

  const {
    load,
    play,
    pause,
    isPlaying,
    duration,
    getPosition,
    seek: audioSeek,
  } = useAudioPlayerContext();
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // RAF-based time tracking with throttling to reduce re-renders
  // Only updates state when position changes by more than threshold
  const rafRef = useRef<number | null>(null);
  const lastReportedTime = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const position = getPosition();
      // Only update state if time changed by more than 16ms (~1 frame)
      // This reduces unnecessary re-renders while maintaining smooth tracking
      if (Math.abs(position - lastReportedTime.current) > 0.016) {
        lastReportedTime.current = position;
        setCurrentTime(position);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, getPosition]);

  const seek = useCallback(
    (time: number) => {
      audioSeek(time);
      setCurrentTime(time);
    },
    [audioSeek]
  );

  useEffect(() => {
    if (queue.length > 0 && queue[currentIndex]) {
      const track = queue[currentIndex];

      if (track.utterance) {
        // Create a new utterance to avoid mutating state
        const utterance = new SpeechSynthesisUtterance(track.utterance.text);
        utterance.rate = track.utterance.rate;
        utterance.pitch = track.utterance.pitch;
        utterance.volume = track.utterance.volume;
        utterance.voice = track.utterance.voice;
        utterance.lang = track.utterance.lang;
        utterance.onend = () => {
          if (currentIndex < queue.length - 1) {
            setCurrentIndex(idx => idx + 1);
          } else {
            setQueue([]);
            setCurrentIndex(0);
          }
        };

        synthesis?.speak(utterance);
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
    current: queue[currentIndex] || undefined,
    isMuted,
    toggleMute,
    currentTime,
    duration,
    seek,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}

