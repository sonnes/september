'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';
import { RecordingStatus } from '@/packages/cloning/types';

export function useRecordingLogic(initialRecordings: Record<string, string> = {}) {
  const [status, setStatus] = useState<Record<string, RecordingStatus>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [recordings, setRecordings] = useState<Record<string, string>>(initialRecordings);
  const { uploadVoiceSample, deleteVoiceSample, downloadVoiceSample, getVoiceSamples } =
    useVoiceStorage();

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const samples = await getVoiceSamples('recording');
        const recordingsMap: Record<string, string> = {};
        samples.forEach(sample => {
          if (sample.sample_id) {
            recordingsMap[sample.sample_id] = sample.id;
          }
        });
        setRecordings(recordingsMap);
      } catch (err) {
        console.error('Error loading recordings:', err);
      }
    };
    loadRecordings();
  }, [getVoiceSamples]);

  const setErrorFor = useCallback((id: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [id]: error }));
  }, []);

  const setStatusFor = useCallback((id: string, status: RecordingStatus) => {
    setStatus(prev => ({ ...prev, [id]: status }));
  }, []);

  const startRecording = useCallback(
    async (id: string) => {
      setStatusFor(id, 'recording');
      setErrorFor(id, null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = event => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const file = new File([blob], `${id}.webm`, { type: 'audio/webm' });

          try {
            setStatusFor(id, 'uploading');
            const sampleId = await uploadVoiceSample({ file, type: 'recording', sampleId: id });
            setStatusFor(id, 'idle');
            setRecordings(prev => ({ ...prev, [id]: sampleId }));
          } catch (err) {
            setStatusFor(id, 'error');
            setErrorFor(id, err instanceof Error ? err.message : 'Failed to upload recording');
          }

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      } catch (err) {
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to start recording');
      }
    },
    [uploadVoiceSample, setErrorFor, setStatusFor]
  );

  const stopRecording = useCallback((id: string) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const deleteRecording = useCallback(
    async (id: string) => {
      setStatusFor(id, 'uploading');
      setErrorFor(id, null);

      try {
        const sampleId = recordings[id];
        if (sampleId) {
          await deleteVoiceSample(sampleId);
        }
        setStatusFor(id, 'idle');
        setRecordings(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to delete recording');
        throw err;
      }
    },
    [recordings, deleteVoiceSample, setErrorFor, setStatusFor]
  );

  const playRecording = useCallback(
    async (id: string) => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });

      try {
        const sampleId = recordings[id];
        if (!sampleId) return;

        const blob = await downloadVoiceSample(sampleId);
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audioRefs.current[id] = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setStatusFor(id, 'idle');
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setStatusFor(id, 'error');
          setErrorFor(id, 'Failed to play recording');
        };

        await audio.play();
        setStatusFor(id, 'playing');
      } catch (err) {
        setStatusFor(id, 'error');
        setErrorFor(id, err instanceof Error ? err.message : 'Failed to play recording');
      }
    },
    [recordings, downloadVoiceSample, setErrorFor, setStatusFor]
  );

  const stopPlaying = useCallback(
    (id: string) => {
      const audio = audioRefs.current[id];
      if (!audio) return;

      audio.pause();
      audio.currentTime = 0;
      setStatusFor(id, 'idle');
    },
    [setStatusFor]
  );

  return {
    recordings,
    startRecording,
    stopRecording,
    deleteRecording,
    playRecording,
    stopPlaying,
    status,
    errors,
  };
}
