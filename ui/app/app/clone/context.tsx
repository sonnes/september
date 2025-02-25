'use client';

import { createContext, useContext, useRef, useState } from 'react';

import { useAuth } from '@/components/context/auth';
import { createClient } from '@/supabase/client';

type UploadStatus = 'idle' | 'uploading' | 'error';

type UploadContextType = {
  status: UploadStatus;
  error: string | null;
  uploadedFiles: string[];
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
};

export const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({
  children,
  initialUploadedFiles,
}: {
  children: React.ReactNode;
  initialUploadedFiles: string[];
}) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialUploadedFiles);

  const supabase = createClient();
  const { user } = useAuth();
  const uploadFile = async (file: File) => {
    setStatus('uploading');
    setError(null);

    try {
      const fileName = `${user?.id}/uploads/${file.name}`;

      const { data, error } = await supabase.storage.from('voice_samples').upload(fileName, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

      if (error) throw error;
      setStatus('idle');
      setUploadedFiles(prev => [...prev, data.path]);
      return data.path;
    } catch (error) {
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to upload file');
      throw error;
    }
  };

  const deleteFile = async (path: string) => {
    setStatus('uploading');
    setError(null);

    try {
      const { error } = await supabase.storage.from('voice_samples').remove([path]);
      if (error) throw error;
      setStatus('idle');
      setUploadedFiles(prev => prev.filter(p => p !== path));
    } catch (error) {
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to delete file');
      throw error;
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

type RecordingStatus = 'idle' | 'recording' | 'uploading' | 'error';

type RecordingContextType = {
  status: Record<string, RecordingStatus>;
  errors: Record<string, string | null>;
  recordings: Record<string, string>;
  startRecording: (id: string) => void;
  stopRecording: (id: string) => void;
  deleteRecording: (id: string) => Promise<void>;
};

export const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({
  children,
  initialRecordings,
}: {
  children: React.ReactNode;
  initialRecordings: Record<string, string>;
}) {
  const [status, setStatus] = useState<Record<string, RecordingStatus>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [recordings, setRecordings] = useState<Record<string, string>>(initialRecordings);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const supabase = createClient();
  const { user } = useAuth();

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
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = event => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `${id}.webm`, { type: 'audio/webm' });

        uploadFile(id, file);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (error) {
      setStatusFor(id, 'error');
      setErrorFor(id, error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const uploadFile = async (id: string, file: File) => {
    setStatusFor(id, 'uploading');
    setErrorFor(id, null);

    try {
      const filePath = `${user?.id}/recordings/${file.name}`;

      const { error } = await supabase.storage.from('voice_samples').upload(filePath, file, {
        cacheControl: 'no-cache',
        upsert: true,
      });

      if (error) throw error;
      setStatusFor(id, 'idle');
      setRecordings(prev => ({ ...prev, [id]: filePath }));
      return filePath;
    } catch (error) {
      setStatusFor(id, 'error');
      setErrorFor(id, error instanceof Error ? error.message : 'Failed to upload file');
      throw error;
    }
  };

  const deleteRecording = async (id: string) => {
    setStatusFor(id, 'uploading');
    setErrorFor(id, null);

    try {
      const { error } = await supabase.storage.from('voice_samples').remove([recordings[id]]);
      if (error) throw error;
      setStatusFor(id, 'idle');
      setRecordings(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      setStatusFor(id, 'error');
      setErrorFor(id, error instanceof Error ? error.message : 'Failed to delete file');
      throw error;
    }
  };

  return (
    <RecordingContext.Provider
      value={{ recordings, startRecording, stopRecording, deleteRecording, status, errors }}
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
