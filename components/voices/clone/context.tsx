'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { useVoiceStorage } from './use-voice-storage';

type UploadStatus = 'idle' | 'uploading' | 'error';

type UploadContextType = {
  status: UploadStatus;
  error: string | null;
  uploadedFiles: string[];
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (id: string) => Promise<void>;
};

export const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({
  children,
  initialUploadedFiles = [],
}: {
  children: React.ReactNode;
  initialUploadedFiles?: string[];
}) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialUploadedFiles);
  const { uploadVoiceSample, deleteVoiceSample, getVoiceSamples } = useVoiceStorage();

  // Load uploaded files on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const samples = await getVoiceSamples('upload');
        setUploadedFiles(samples.map(s => s.id));
      } catch (err) {
        console.error('Error loading uploaded files:', err);
      }
    };
    loadFiles();
  }, [getVoiceSamples]);

  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setError(null);

    try {
      const id = await uploadVoiceSample({ file, type: 'upload' });
      setStatus('idle');
      setUploadedFiles(prev => [...prev, id]);
      return id;
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteFile = async (id: string) => {
    setStatus('uploading');
    setError(null);

    try {
      await deleteVoiceSample(id);
      setStatus('idle');
      setUploadedFiles(prev => prev.filter(fileId => fileId !== id));
    } catch (err) {
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <UploadContext.Provider value={{ status, error, uploadedFiles, uploadFile, deleteFile }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within a UploadProvider');
  return context;
}

type RecordingStatus = 'idle' | 'recording' | 'uploading' | 'error' | 'playing';

type RecordingContextType = {
  status: Record<string, RecordingStatus>;
  errors: Record<string, string | null>;
  recordings: Record<string, string>;
  startRecording: (id: string) => void;
  stopRecording: (id: string) => void;
  deleteRecording: (id: string) => Promise<void>;
  playRecording: (id: string) => Promise<void>;
  stopPlaying: (id: string) => void;
};

export const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({
  children,
  initialRecordings = {},
}: {
  children: React.ReactNode;
  initialRecordings?: Record<string, string>;
}) {
  const [status, setStatus] = useState<Record<string, RecordingStatus>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [recordings, setRecordings] = useState<Record<string, string>>(initialRecordings);
  const { uploadVoiceSample, deleteVoiceSample, downloadVoiceSample, getVoiceSamples } =
    useVoiceStorage();

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load recordings on mount
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

  const setErrorFor = (id: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [id]: error }));
  };

  const setStatusFor = (id: string, status: RecordingStatus) => {
    setStatus(prev => ({ ...prev, [id]: status }));
  };

  const startRecording = async (id: string) => {
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

        // Stop all tracks
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
  };

  const stopRecording = (id: string) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  const deleteRecording = async (id: string) => {
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
  };

  const playRecording = async (id: string) => {
    // Stop any currently playing audio
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
  };

  const stopPlaying = (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setStatusFor(id, 'idle');
  };

  return (
    <RecordingContext.Provider
      value={{
        recordings,
        startRecording,
        stopRecording,
        deleteRecording,
        playRecording,
        stopPlaying,
        status,
        errors,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) throw new Error('useRecording must be used within a RecordingProvider');
  return context;
}
