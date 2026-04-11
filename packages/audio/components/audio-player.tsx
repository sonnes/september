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

import { Audio as AudioTrack } from '@september/audio/types';

interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

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
  // Audio output device selection
  outputDevices: AudioOutputDevice[];
  isDeviceSelectionSupported: boolean;
  selectedOutputDeviceId: string;
  setSelectedOutputDeviceId: (id: string) => void;
  refreshOutputDevices: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  return (
    <AudioPlayerProviderBase>
      <AudioPlayerQueueProvider>{children}</AudioPlayerQueueProvider>
    </AudioPlayerProviderBase>
  );
}

const AUDIO_OUTPUT_STORAGE_KEY = 'september:audio-output-device';

const isDeviceSelectionSupported =
  typeof navigator !== 'undefined' &&
  typeof HTMLAudioElement !== 'undefined' &&
  'setSinkId' in HTMLAudioElement.prototype;

function AudioPlayerQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [outputDevices, setOutputDevices] = useState<AudioOutputDevice[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceIdState] = useState<string>(() =>
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY) ?? '')
      : ''
  );
  const sinkAudioRef = useRef<HTMLAudioElement | null>(null);
  // State for sinkId audio element (separate from react-use-audio-player)
  const [isSinkPlaying, setIsSinkPlaying] = useState(false);
  const [sinkDuration, setSinkDuration] = useState(0);
  const [sinkCurrentTime, setSinkCurrentTime] = useState(0);

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

  // RAF-based time tracking for react-use-audio-player path
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
      if (sinkAudioRef.current && isSinkPlaying) {
        sinkAudioRef.current.currentTime = time;
        setSinkCurrentTime(time);
      } else {
        audioSeek(time);
        setCurrentTime(time);
      }
    },
    [audioSeek, isSinkPlaying]
  );

  const refreshOutputDevices = useCallback(async () => {
    if (!isDeviceSelectionSupported) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setOutputDevices(
      devices
        .filter(d => d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` }))
    );
  }, []);

  // Enumerate on mount and whenever devices change
  useEffect(() => {
    if (!isDeviceSelectionSupported) return;
    refreshOutputDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshOutputDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshOutputDevices);
  }, [refreshOutputDevices]);

  // Stop sinkId audio on unmount
  useEffect(() => () => { sinkAudioRef.current?.pause(); }, []);

  const setSelectedOutputDeviceId = useCallback((id: string) => {
    localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, id);
    setSelectedOutputDeviceIdState(id);
  }, []);

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

        const advance = () => {
          setIsSinkPlaying(false);
          if (currentIndex < queue.length - 1) {
            setCurrentIndex(idx => idx + 1);
          } else {
            setQueue([]);
            setCurrentIndex(0);
          }
        };

        if (selectedOutputDeviceId) {
          sinkAudioRef.current?.pause();
          const audioEl = new Audio(src);
          sinkAudioRef.current = audioEl;
          audioEl.onplay = () => setIsSinkPlaying(true);
          audioEl.onpause = () => setIsSinkPlaying(false);
          audioEl.ondurationchange = () => setSinkDuration(audioEl.duration);
          audioEl.ontimeupdate = () => setSinkCurrentTime(audioEl.currentTime);
          audioEl.onended = advance;
          (audioEl as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
            .setSinkId(selectedOutputDeviceId)
            .then(() => audioEl.play())
            .catch(err => {
              console.error('setSinkId failed, falling back to default device:', err);
              audioEl.play().catch(() => {});
            });
        } else {
          load(src, { autoplay: true, onend: advance });
        }
      }
    }
  }, [queue, currentIndex, load, synthesis, selectedOutputDeviceId]);

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

  // Toggle play/pause — handles both sinkId and react-use-audio-player paths
  const togglePlayPause = useCallback(() => {
    if (sinkAudioRef.current && isSinkPlaying) {
      sinkAudioRef.current.pause();
    } else if (sinkAudioRef.current && !isSinkPlaying && sinkAudioRef.current.src) {
      sinkAudioRef.current.play();
    } else if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, isSinkPlaying, play, pause]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Merge state: sinkId path takes precedence when active
  const value: AudioPlayerContextType = {
    isPlaying: isSinkPlaying || isPlaying,
    enqueue,
    togglePlayPause,
    current: queue[currentIndex] || undefined,
    isMuted,
    toggleMute,
    currentTime: isSinkPlaying ? sinkCurrentTime : currentTime,
    duration: isSinkPlaying ? sinkDuration : duration,
    seek,
    outputDevices,
    isDeviceSelectionSupported,
    selectedOutputDeviceId,
    setSelectedOutputDeviceId,
    refreshOutputDevices,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
