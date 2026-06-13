import { uploadAudioBinary, listAudio, deleteAudio, downloadAudio } from '@september/audio';
import type { VoiceSample } from './types';

export async function uploadVoiceSample({
  userId,
  file,
  type,
  sampleId,
}: {
  userId: string;
  file: File;
  type: 'upload' | 'recording';
  sampleId?: string;
}): Promise<string> {
  const contentType = file.type || 'audio/webm';
  const filename =
    type === 'recording' && sampleId ? `${sampleId}.webm` : `${Date.now()}-${file.name}`;
  const path = `voice-samples/${userId}/${type}/${filename}`;

  await uploadAudioBinary({
    path,
    blob: file,
    contentType,
    metadata: {
      user_id: userId,
      type,
      sample_id: sampleId,
      file_name: type === 'upload' ? file.name : undefined,
    },
  });

  return path;
}

export async function getVoiceSamples(
  userId: string,
  type?: 'upload' | 'recording'
): Promise<VoiceSample[]> {
  if (!type) {
    const [uploads, recordings] = await Promise.all([
      getVoiceSamples(userId, 'upload'),
      getVoiceSamples(userId, 'recording'),
    ]);
    return [...uploads, ...recordings];
  }

  const folderPath = `voice-samples/${userId}/${type}`;
  const files = await listAudio(folderPath);

  return (files || []).map(file => {
    const metadata = file.metadata || {};
    return {
      id: `${folderPath}/${file.name}`,
      user_id: (metadata.user_id as string) || userId,
      type: (metadata.type as 'upload' | 'recording') || type,
      sample_id: metadata.sample_id as string | undefined,
      file_name: metadata.file_name as string | undefined,
      created_at: new Date(file.created_at),
    };
  });
}

export async function deleteVoiceSample(id: string): Promise<void> {
  await deleteAudio(id);
}

export async function downloadVoiceSample(id: string): Promise<Blob> {
  return downloadAudio(id);
}
