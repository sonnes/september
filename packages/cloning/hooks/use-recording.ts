'use client';

import { useCallback, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useMediaRecorder } from '@/packages/cloning/hooks/use-media-recorder';
import { useAudioPlayback } from '@/packages/cloning/hooks/use-audio-playback';
import { useRecordingState } from '@/packages/cloning/hooks/use-recording-state';
import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';

export interface UseRecordingReturn {
  recordings: Record<string, string>;
  startRecording: (id: string) => Promise<void>;
  stopRecording: () => void;
  deleteRecording: (id: string) => Promise<void>;
  playRecording: (id: string) => Promise<void>;
  stopPlaying: () => void;
  status: Record<string, string | null>;
  errors: Record<string, string | null>;
}

export function useRecording(initialRecordings: Record<string, string> = {}): UseRecordingReturn {
  const [recordingStatus, setRecordingStatus] = useState<Record<string, string | null>>({});
  const mediaRecorder = useMediaRecorder();
  const audioPlayback = useAudioPlayback();
  const recordingState = useRecordingState(initialRecordings);
  const { downloadVoiceSample } = useVoiceStorage();

  // Connect recording completion to state save
  const handleRecordingComplete = useCallback(
    async (id: string, blob: Blob) => {
      try {
        await recordingState.saveRecording(id, blob);
        setRecordingStatus(prev => ({ ...prev, [id]: null }));
        toast.success('Recording saved');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save recording';
        setRecordingStatus(prev => ({ ...prev, [id]: message }));
        toast.error(message);
      }
    },
    [recordingState]
  );

  mediaRecorder.onRecordingComplete(handleRecordingComplete);

  const playRecording = useCallback(
    async (id: string) => {
      try {
        const sampleId = recordingState.recordings[id];
        if (!sampleId) return;

        const blob = await downloadVoiceSample(sampleId);
        const url = URL.createObjectURL(blob);

        await audioPlayback.playRecording(id, url);

        // Clean up URL after playback completes or errors
        const audio = new Audio(url);
        const cleanup = () => URL.revokeObjectURL(url);
        audio.addEventListener('ended', cleanup);
        audio.addEventListener('error', cleanup);
      } catch (err) {
        console.error('Error playing recording:', err);
        toast.error('Failed to play recording');
      }
    },
    [recordingState, downloadVoiceSample, audioPlayback]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      setRecordingStatus(prev => ({ ...prev, [id]: null }));
      try {
        await recordingState.deleteRecording(id);
        toast.success('Recording deleted');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete recording';
        setRecordingStatus(prev => ({ ...prev, [id]: message }));
        toast.error(message);
        throw err;
      }
    },
    [recordingState]
  );

  // Combine status and errors from all hooks
  const status = {
    ...mediaRecorder.recordingStatus,
    ...audioPlayback.playbackStatus,
  };

  const errors = {
    ...mediaRecorder.recordingError,
    ...audioPlayback.playbackError,
    ...recordingStatus,
  };

  return {
    recordings: recordingState.recordings,
    startRecording: mediaRecorder.startRecording,
    stopRecording: mediaRecorder.stopRecording,
    deleteRecording,
    playRecording,
    stopPlaying: audioPlayback.stopPlaying,
    status,
    errors,
  };
}
