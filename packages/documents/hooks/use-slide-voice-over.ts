'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Alignment } from '@september/audio/types';
import { AudioService } from '@september/audio/lib/audio-service';
import { useAISettings } from '@september/ai';
import { useSpeech } from '@september/speech/hooks/use-speech';

const audioService = new AudioService();

/** djb2 hash — fast, no async, good enough for cache keys */
function hashKey(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function cachePath(provider: string, voiceId: string, text: string): string {
  return `slides/audio/${hashKey(`${provider}:${voiceId}:${text}`)}`;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface UseSlideVoiceOverReturn {
  isGenerating: boolean;
  isPlaying: boolean;
  alignment: Alignment | undefined;
  currentTime: number;
  duration: number;
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
}

export function useSlideVoiceOver(): UseSlideVoiceOverReturn {
  const { generateSpeech } = useSpeech();
  const { speechConfig } = useAISettings();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef<(() => void) | undefined>(undefined);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [alignment, setAlignment] = useState<Alignment | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (utteranceRef.current && typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAlignment(undefined);
    onEndRef.current = undefined;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const playBlob = useCallback(
    (src: string, cachedAlignment: Alignment | undefined, onEnd?: () => void) => {
      setAlignment(cachedAlignment);

      const audio = new Audio(src);
      audio.src = src;
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        audioRef.current = null;
        const cb = onEnd ?? onEndRef.current;
        onEndRef.current = undefined;
        cb?.();
      });
      audio.addEventListener('error', () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.play().catch(() => {
        setIsPlaying(false);
        audioRef.current = null;
      });
    },
    []
  );

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text.trim()) return;

      stop();
      onEndRef.current = onEnd;

      const provider = speechConfig.provider ?? 'browser';
      const voiceId = speechConfig.voice_id ?? '';
      const path = cachePath(provider, voiceId, text);

      setIsGenerating(true);

      // Check cache first
      audioService
        .getAudio(path)
        .then(async cached => {
          if (cached) {
            setIsGenerating(false);
            const src = await blobToDataUri(cached.blob);
            playBlob(src, cached.alignment, onEnd);
            return;
          }

          // Cache miss — generate
          const promise = generateSpeech(text);

          if (!promise) {
            setIsGenerating(false);
            onEnd?.();
            return;
          }

          promise
            .then(async response => {
              setIsGenerating(false);

              if (response.utterance) {
                const utt = response.utterance;
                utteranceRef.current = utt;

                utt.onstart = () => setIsPlaying(true);
                utt.onend = () => {
                  setIsPlaying(false);
                  utteranceRef.current = null;
                  const cb = onEndRef.current;
                  onEndRef.current = undefined;
                  cb?.();
                };
                utt.onerror = () => {
                  setIsPlaying(false);
                  utteranceRef.current = null;
                };

                window.speechSynthesis.speak(utt);
              } else if (response.blob) {
                const src = response.blob.startsWith('data:')
                  ? response.blob
                  : `data:audio/mp3;base64,${response.blob}`;

                // Save to cache (fire-and-forget)
                audioService
                  .uploadAudio({ path, blob: src, alignment: response.alignment })
                  .catch(() => {});

                playBlob(src, response.alignment, onEnd);
              }
            })
            .catch(() => {
              setIsGenerating(false);
              setIsPlaying(false);
            });
        })
        .catch(() => {
          // Cache read failed — fall through to generate
          setIsGenerating(false);
        });
    },
    [generateSpeech, stop, playBlob, speechConfig.provider, speechConfig.voice_id]
  );

  return { isGenerating, isPlaying, alignment, currentTime, duration, speak, stop };
}
