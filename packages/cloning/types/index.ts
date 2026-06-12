export interface VoiceSample {
  id: string;
  user_id: string;
  type: 'upload' | 'recording';
  sample_id?: string;
  file_name?: string;
  created_at: Date;
}

export type UploadStatus = 'idle' | 'uploading' | 'error';

export type RecordingStatus = 'idle' | 'recording' | 'uploading' | 'error' | 'playing';
