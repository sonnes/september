'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mergeStreams } from '../lib/stream-merger';
import type {
  RecordingFormat,
  RecordingStatus,
  UseAudioDestinationReturn,
  UseRecordingReturn,
} from '../types';
import { useVideoStream } from './use-video-stream';

export function useRecording(audioDestination: UseAudioDestinationReturn): UseRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<RecordingFormat | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoStream = useVideoStream();

  // Update duration every second while recording
  useEffect(() => {
    if (status === 'recording' && startTimeRef.current) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  const startRecording = useCallback(async () => {
    setStatus('initializing');
    setError(null);
    setRecordingBlob(null);
    setFormat(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      // Get video stream from webcam
      const video = await videoStream.initializeStream();

      // Get audio stream from Web Audio API destination
      const audio = audioDestination.getAudioStream();

      if (!audio) {
        throw new Error('Audio destination not initialized');
      }

      // Merge video and audio streams
      const combinedStream = mergeStreams(video, audio);

      // Check for supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        throw new Error('No supported video MIME type found');
      }

      // Create MediaRecorder with WebM output
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setStatus('stopping');

        // Create WebM blob
        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });

        // Validate we have actual data
        if (chunksRef.current.length === 0 || webmBlob.size === 0) {
          console.error('[Recording] No data recorded');
          setError('No data was recorded. Please try again.');
          setStatus('error');
          videoStream.stopStream();
          return;
        }

        // Use native WebM format directly
        setRecordingBlob(webmBlob);
        setFormat('webm');
        setStatus('ready');

        // Cleanup streams
        videoStream.stopStream();
      };

      recorder.onerror = event => {
        const errorMessage = 'Recording error occurred';
        console.error('[Recording]', errorMessage, event);
        setError(errorMessage);
        setStatus('error');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second

      startTimeRef.current = Date.now();
      setStatus('recording');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[Recording] Start error:', err);
      setError(errorMessage);
      setStatus('error');
      videoStream.stopStream();
    }
  }, [videoStream, audioDestination]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      // Request any pending data before stopping
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [status]);

  const downloadRecording = useCallback(() => {
    if (!recordingBlob || !format) return;

    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().slice(0, 10)}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordingBlob, format]);

  const resetRecording = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDuration(0);
    setRecordingBlob(null);
    setFormat(null);
    chunksRef.current = [];
    startTimeRef.current = null;
  }, []);

  return {
    status,
    error,
    duration,
    recordingBlob,
    format,
    conversionProgress: 0, // No conversion needed
    startRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
  };
}
