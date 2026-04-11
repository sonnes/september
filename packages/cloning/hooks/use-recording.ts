'use client';

import { useCallback, useEffect } from 'react';

import { toast } from 'sonner';

import { useMediaRecorder } from '@september/cloning/hooks/use-media-recorder';
import { useAudioPlayback } from '@september/cloning/hooks/use-audio-playback';
import { useRecordingState } from '@september/cloning/hooks/use-recording-state';
import { useVoiceStorage, UseVoiceStorageReturn } from '@september/cloning/hooks/use-voice-storage';
import { RecordingStatus } from '../types';

export interface UseRecordingReturn {
  recordings: Record<string, string>;
  startRecording: (id: string) => Promise<void>;
  stopRecording: (id: string) => void;
  deleteRecording: (id: string) => Promise<void>;
  playRecording: (id: string) => Promise<void>;
  stopPlaying: (id: string) => void;
  status: Record<string, RecordingStatus>;
  errors: Record<string, string | null>;
}

export function useRecording(
  initialRecordings: Record<string, string> = {},
  sharedStorage?: UseVoiceStorageReturn
): UseRecordingReturn {
  const mediaRecorder = useMediaRecorder();
  const audioPlayback = useAudioPlayback();
  const recordingState = useRecordingState(initialRecordings, sharedStorage);
  const ownStorage = useVoiceStorage();
  const { downloadVoiceSample } = sharedStorage ?? ownStorage;

  // Register the completion handler in useEffect — not during render
  useEffect(() => {
    mediaRecorder.onRecordingComplete(async (id: string, blob: Blob) => {
      try {
        await recordingState.saveRecording(id, blob);
        toast.success('Recording saved');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save recording';
        toast.error(message);
      }
    });
  }, [mediaRecorder, recordingState]);

  const playRecording = useCallback(
    async (id: string) => {
      try {
        const sampleId = recordingState.recordings[id];
        if (!sampleId) return;

        const blob = await downloadVoiceSample(sampleId);
        // Pass Blob directly — useAudioPlayback owns URL creation and revocation
        await audioPlayback.playRecording(id, blob);
      } catch (err) {
        console.error('Error playing recording:', err);
        toast.error('Failed to play recording');
      }
    },
    [recordingState, downloadVoiceSample, audioPlayback]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      try {
        await recordingState.deleteRecording(id);
        toast.success('Recording deleted');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete recording';
        toast.error(message);
        throw err;
      }
    },
    [recordingState]
  );

  const status = {
    ...mediaRecorder.recordingStatus,
    ...audioPlayback.playbackStatus,
  };

  const errors = {
    ...mediaRecorder.recordingError,
    ...audioPlayback.playbackError,
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
