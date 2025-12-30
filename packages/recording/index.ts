// Components
export { RecordingProvider, useRecordingContext } from './components/recording-provider';
export { RecordingControls } from './components/recording-controls';

// Hooks
export { useRecording } from './hooks/use-recording';
export { useVideoStream } from './hooks/use-video-stream';
export { useAudioDestination } from './hooks/use-audio-destination';

// Types
export type {
  RecordingStatus,
  RecordingFormat,
  RecordingMetadata,
  UseRecordingReturn,
  UseVideoStreamReturn,
  UseAudioDestinationReturn,
} from './types';

// Utilities
export { mergeStreams } from './lib/stream-merger';
