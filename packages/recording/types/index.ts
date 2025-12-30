import { z } from 'zod';

// Recording status states
export type RecordingStatus =
  | 'idle'           // Not recording
  | 'initializing'   // Setting up streams
  | 'recording'      // Actively recording
  | 'stopping'       // Stopping recorder
  | 'converting'     // Converting WebM to MP4
  | 'ready'          // Recording ready for download
  | 'error';         // Error occurred

// Recording format
export type RecordingFormat = 'webm' | 'mp4';

// Recording metadata schema
export const RecordingMetadataSchema = z.object({
  id: z.string(),
  format: z.enum(['webm', 'mp4']),
  duration: z.number(),
  createdAt: z.date(),
  sizeBytes: z.number().optional(),
});

export type RecordingMetadata = z.infer<typeof RecordingMetadataSchema>;

// Hook return types
export interface UseRecordingReturn {
  // State
  status: RecordingStatus;
  error: string | null;
  duration: number;
  recordingBlob: Blob | null;
  format: RecordingFormat | null;
  conversionProgress: number; // 0-100 percentage

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  downloadRecording: () => void;
  resetRecording: () => void;
}

export interface UseVideoStreamReturn {
  videoStream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  initializeStream: () => Promise<MediaStream>;
  stopStream: () => void;
}

export interface UseAudioDestinationReturn {
  audioDestination: MediaStreamAudioDestinationNode | null;
  connectAudio: (audioElement: HTMLAudioElement) => void;
  disconnectAudio: () => void;
  getAudioStream: () => MediaStream | null;
}

export interface UseMediaConverterReturn {
  convert: (webmBlob: Blob) => Promise<Blob>;
  isConverting: boolean;
  progress: number; // 0-100
  error: string | null;
}
