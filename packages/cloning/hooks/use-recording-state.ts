'use client';

import { useCallback, useEffect, useState } from 'react';

import { useVoiceStorage } from '@/packages/cloning/hooks/use-voice-storage';

interface UseRecordingStateReturn {
  recordings: Record<string, string>;
  setRecordings: (recordings: Record<string, string>) => void;
  saveRecording: (id: string, blob: Blob) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
}

export function useRecordingState(
  initialRecordings: Record<string, string> = {}
): UseRecordingStateReturn {
  const [recordings, setRecordings] = useState<Record<string, string>>(initialRecordings);
  const { uploadVoiceSample, deleteVoiceSample, getVoiceSamples } = useVoiceStorage();

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

  const saveRecording = useCallback(
    async (id: string, blob: Blob) => {
      try {
        const file = new File([blob], `${id}.webm`, { type: 'audio/webm' });
        const sampleId = await uploadVoiceSample({ file, type: 'recording', sampleId: id });
        setRecordings(prev => ({ ...prev, [id]: sampleId }));
      } catch (err) {
        console.error('Error saving recording:', err);
        throw err;
      }
    },
    [uploadVoiceSample]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      try {
        const sampleId = recordings[id];
        if (sampleId) {
          await deleteVoiceSample(sampleId);
        }
        setRecordings(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err) {
        console.error('Error deleting recording:', err);
        throw err;
      }
    },
    [recordings, deleteVoiceSample]
  );

  return {
    recordings,
    setRecordings,
    saveRecording,
    deleteRecording,
  };
}
