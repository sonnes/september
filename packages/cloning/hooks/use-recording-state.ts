'use client';

import { useCallback, useEffect, useState } from 'react';

import { useVoiceStorage, UseVoiceStorageReturn } from '@september/cloning/hooks/use-voice-storage';

interface UseRecordingStateReturn {
  recordings: Record<string, string>;
  setRecordings: (recordings: Record<string, string>) => void;
  saveRecording: (id: string, blob: Blob) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
}

export function useRecordingState(
  initialRecordings: Record<string, string> = {},
  sharedStorage?: UseVoiceStorageReturn
): UseRecordingStateReturn {
  const [recordings, setRecordings] = useState<Record<string, string>>(initialRecordings);
  const ownStorage = useVoiceStorage();
  const { uploadVoiceSample, deleteVoiceSample, getVoiceSamples } =
    sharedStorage ?? ownStorage;

  useEffect(() => {
    getVoiceSamples('recording')
      .then(samples => {
        const map: Record<string, string> = {};
        samples.forEach(sample => {
          if (sample.sample_id) map[sample.sample_id] = sample.id;
        });
        setRecordings(map);
      })
      .catch(err => console.error('Error loading recordings:', err));
  }, [getVoiceSamples]);

  const saveRecording = useCallback(
    async (id: string, blob: Blob) => {
      const file = new File([blob], `${id}.webm`, { type: 'audio/webm' });
      const sampleId = await uploadVoiceSample({ file, type: 'recording', sampleId: id });
      setRecordings(prev => ({ ...prev, [id]: sampleId }));
    },
    [uploadVoiceSample]
  );

  const deleteRecording = useCallback(
    async (id: string) => {
      const sampleId = recordings[id];
      if (sampleId) await deleteVoiceSample(sampleId);
      setRecordings(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
