'use client';

import { useCallback, useRef } from 'react';
import type { UseAudioDestinationReturn } from '../types';

export function useAudioDestination(): UseAudioDestinationReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    // Create AudioContext and destination on first use
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
    }

    // Disconnect previous source if exists
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    try {
      // Create source from audio element
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current = source;

      // Connect to destination (for recording)
      if (destinationRef.current) {
        source.connect(destinationRef.current);
      }

      // ALSO connect to default destination (for speaker playback)
      source.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('[AudioDestination] Failed to connect audio:', err);
    }
  }, []);

  const disconnectAudio = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const getAudioStream = useCallback(() => {
    // Ensure AudioContext and destination are initialized
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
    }

    // Create a silent oscillator to keep the audio track active
    // This prevents MediaRecorder from producing 0-byte chunks
    if (audioContextRef.current && destinationRef.current) {
      const oscillator = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      gain.gain.value = 0; // Silent
      oscillator.connect(gain);
      gain.connect(destinationRef.current);
      oscillator.start();
    }

    return destinationRef.current?.stream || null;
  }, []);

  return {
    audioDestination: null, // Ref should not be accessed during render
    connectAudio,
    disconnectAudio,
    getAudioStream,
  };
}
