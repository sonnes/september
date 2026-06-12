'use client';

import { useCallback, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { useCurrentUser } from '@september/account';

import type { RecordingStatus } from '../types';
import { deleteVoiceSample, downloadVoiceSample, getVoiceSamples, uploadVoiceSample } from '../voice-samples';
import { useAudioPlayback } from './use-audio-playback';
import { useMediaRecorder } from './use-media-recorder';

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

export function useRecording(): UseRecordingReturn {
  const { user } = useCurrentUser();
  const userId = user.id;

  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const mediaRecorder = useMediaRecorder();
  const audioPlayback = useAudioPlayback();

  // Load existing recordings on mount
  useEffect(() => {
    getVoiceSamples(userId, 'recording')
      .then(samples => {
        const map: Record<string, string> = {};
        samples.forEach(sample => {
          if (sample.sample_id) map[sample.sample_id] = sample.id;
        });
        setRecordings(map);
      })
      .catch(err => console.error('Error loading recordings:', err));
  }, [userId]);

  // Register the completion handler
  useEffect(() => {
    mediaRecorder.onRecordingComplete(async (id: string, blob: Blob) => {
      try {
        const file = new File([blob], `${id}.webm`, { type: 'audio/webm' });
        const sampleId = await uploadVoiceSample({ userId, file, type: 'recording', sampleId: id });
        setRecordings(prev => ({ ...prev, [id]: sampleId }));
        toast.success('Recording saved');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save recording';
        toast.error(message);
      }
    });
  }, [mediaRecorder, userId]);

  const playRecording = useCallback(
    async (id: string) => {
      try {
        const sampleId = recordings[id];
        if (!sampleId) return;
        const blob = await downloadVoiceSample(sampleId);
        await audioPlayback.playRecording(id, blob);
      } catch (err) {
        console.error('Error playing recording:', err);
        toast.error('Failed to play recording');
      }
    },
    [recordings, audioPlayback]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      try {
        const sampleId = recordings[id];
        if (sampleId) await deleteVoiceSample(sampleId);
        setRecordings(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.success('Recording deleted');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete recording';
        toast.error(message);
        throw err;
      }
    },
    [recordings]
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
    recordings,
    startRecording: mediaRecorder.startRecording,
    stopRecording: mediaRecorder.stopRecording,
    deleteRecording,
    playRecording,
    stopPlaying: audioPlayback.stopPlaying,
    status,
    errors,
  };
}
