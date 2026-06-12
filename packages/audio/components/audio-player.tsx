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

import type { Audio as AudioTrack } from '../types';

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

export interface AudioPlayerContextType {
  isPlaying: boolean;
  enqueue: (track: AudioTrack) => void;
  togglePlayPause: () => void;
  current: AudioTrack | null;
  isMuted: boolean;
  toggleMute: () => void;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
  outputDevices: AudioOutputDevice[];
  isDeviceSelectionSupported: boolean;
  selectedOutputDeviceId: string | null;
  setSelectedOutputDeviceId: (id: string) => void;
  refreshOutputDevices: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const AUDIO_OUTPUT_STORAGE_KEY = 'september:audio-output-device';

// Feature-detected once at module load — stable across renders
const isDeviceSelectionSupported =
  typeof navigator !== 'undefined' &&
  typeof HTMLAudioElement !== 'undefined' &&
  'setSinkId' in HTMLAudioElement.prototype;

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [outputDevices, setOutputDevices] = useState<AudioOutputDevice[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceIdState] = useState<string | null>(() =>
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem(AUDIO_OUTPUT_STORAGE_KEY) ?? null)
      : null
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastReportedTime = useRef(0);

  // RAF-based time tracking — updates only when time changes by more than ~1 frame
  const startRaf = useCallback(() => {
    if (rafRef.current) return;
    const tick = () => {
      const el = audioRef.current;
      if (!el) { rafRef.current = null; return; }
      const t = el.currentTime;
      if (Math.abs(t - lastReportedTime.current) > 0.016) {
        lastReportedTime.current = t;
        setCurrentTime(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Pause and clean up audio element on unmount
  useEffect(() => () => {
    stopRaf();
    audioRef.current?.pause();
  }, [stopRaf]);

  // Output device enumeration
  const refreshOutputDevices = useCallback(async () => {
    if (!isDeviceSelectionSupported) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setOutputDevices(
      devices.filter(
        d => d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications'
      // MediaDeviceInfo properties are prototype getters — spreading would drop deviceId
      ).map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` }))
    );
  }, []);

  useEffect(() => {
    if (!isDeviceSelectionSupported) return;
    refreshOutputDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshOutputDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshOutputDevices);
  }, [refreshOutputDevices]);

  const setSelectedOutputDeviceId = useCallback((id: string) => {
    localStorage.setItem(AUDIO_OUTPUT_STORAGE_KEY, id);
    setSelectedOutputDeviceIdState(id || null);
    // Apply to currently playing element too
    if (audioRef.current && id && isDeviceSelectionSupported) {
      (audioRef.current as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
        .setSinkId(id)
        .catch(err => console.error('setSinkId failed on running element:', err));
    }
  }, []);

  const advance = useCallback((q: AudioTrack[], idx: number) => {
    if (idx < q.length - 1) {
      setCurrentIndex(idx + 1);
    } else {
      setQueue([]);
      setCurrentIndex(0);
    }
  }, []);

  // Play current track whenever queue/index changes
  useEffect(() => {
    if (!queue.length || !queue[currentIndex]) return;

    const track = queue[currentIndex];

    // utterance path
    if (track.utterance) {
      const utt = new SpeechSynthesisUtterance(track.utterance.text);
      utt.rate = track.utterance.rate;
      utt.pitch = track.utterance.pitch;
      utt.volume = track.utterance.volume;
      utt.voice = track.utterance.voice;
      utt.lang = track.utterance.lang;
      utt.onend = () => {
        setIsPlaying(false);
        advance(queue, currentIndex);
      };
      setIsPlaying(true);
      window.speechSynthesis?.speak(utt);
      return;
    }

    // blob path
    if (track.blob) {
      const src = track.blob.startsWith('data:') ? track.blob : `data:audio/mp3;base64,${track.blob}`;

      // Clean up previous element
      audioRef.current?.pause();
      stopRaf();

      const el = new Audio(src) as HTMLAudioElement;
      audioRef.current = el;
      setCurrentTime(0);
      lastReportedTime.current = 0;

      el.addEventListener('play', () => { setIsPlaying(true); startRaf(); });
      el.addEventListener('pause', () => { setIsPlaying(false); stopRaf(); });
      el.addEventListener('ended', () => {
        setIsPlaying(false);
        stopRaf();
        advance(queue, currentIndex);
      });
      el.addEventListener('durationchange', () => setDuration(isFinite(el.duration) ? el.duration : 0));
      el.addEventListener('loadedmetadata', () => setDuration(isFinite(el.duration) ? el.duration : 0));

      if (selectedOutputDeviceId && isDeviceSelectionSupported) {
        (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
          .setSinkId(selectedOutputDeviceId)
          .then(() => el.play())
          .catch(err => {
            console.error('setSinkId failed, falling back to default device:', err);
            el.play().catch(() => {});
          });
      } else {
        el.play().catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex]);

  const enqueue = useCallback((track: AudioTrack) => {
    if (isMuted) return;
    setQueue(prev => {
      if (prev.length === 0) {
        setCurrentIndex(0);
        return [track];
      }
      return [...prev, track];
    });
  }, [isMuted]);

  const togglePlayPause = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

  const seek = useCallback((time: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = time;
    setCurrentTime(time);
    lastReportedTime.current = time;
  }, []);

  const value: AudioPlayerContextType = {
    isPlaying,
    enqueue,
    togglePlayPause,
    current: queue[currentIndex] ?? null,
    isMuted,
    toggleMute,
    currentTime,
    duration,
    seek,
    outputDevices,
    isDeviceSelectionSupported,
    selectedOutputDeviceId,
    setSelectedOutputDeviceId,
    refreshOutputDevices,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer(): AudioPlayerContextType {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
