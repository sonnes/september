'use client';

import { useCallback, useRef, useState } from 'react';

import { useMediaRecorder } from '@/packages/cloning/hooks/use-media-recorder';
import { useAudioPlayback } from '@/packages/cloning/hooks/use-audio-playback';
import { useRecordingState } from '@/packages/cloning/hooks/use-recording-state';
import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';

export function useRecordingLogic(initialRecordings: Record<string, string> = {}) {
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
      } catch (err) {
        setRecordingStatus(prev => ({
          ...prev,
          [id]: err instanceof Error ? err.message : 'Failed to save recording',
        }));
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
      }
    },
    [recordingState, downloadVoiceSample, audioPlayback]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      setRecordingStatus(prev => ({ ...prev, [id]: null }));
      try {
        await recordingState.deleteRecording(id);
      } catch (err) {
        setRecordingStatus(prev => ({
          ...prev,
          [id]: err instanceof Error ? err.message : 'Failed to delete recording',
        }));
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

// Export as useRecordingLogic for context usage
export { useRecordingLogic as useRecording };
