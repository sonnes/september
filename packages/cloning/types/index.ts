import { z } from 'zod';

export const VoiceSampleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['upload', 'recording']),
  sample_id: z.string().optional(),
  blob: z.string(),
  file_name: z.string().optional(),
  created_at: z.date(),
});

export type VoiceSample = z.infer<typeof VoiceSampleSchema>;

export type UploadStatus = 'idle' | 'uploading' | 'error';

export type UploadContextType = {
  status: UploadStatus;
  error: string | null;
  uploadedFiles: string[];
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (id: string) => Promise<void>;
};

export type RecordingStatus = 'idle' | 'recording' | 'uploading' | 'error' | 'playing';

export type RecordingContextType = {
  status: Record<string, RecordingStatus>;
  errors: Record<string, string | null>;
  recordings: Record<string, string>;
  startRecording: (id: string) => void;
  stopRecording: (id: string) => void;
  deleteRecording: (id: string) => Promise<void>;
  playRecording: (id: string) => Promise<void>;
  stopPlaying: (id: string) => void;
};
