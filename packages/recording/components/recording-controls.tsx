'use client';

import { Circle, Download, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecordingContext } from './recording-provider';

export function RecordingControls() {
  const { recording } = useRecordingContext();

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (recording.status) {
      case 'initializing':
        return 'Initializing...';
      case 'recording':
        return 'Recording';
      case 'stopping':
        return 'Stopping...';
      case 'converting':
        return `Converting to MP4 (${recording.conversionProgress}%)`;
      case 'ready':
        return `Ready (${recording.format?.toUpperCase()})`;
      case 'error':
        return 'Error';
      default:
        return 'Ready to record';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Control Buttons */}
          <div className="flex items-center gap-2">
            {recording.status === 'idle' || recording.status === 'ready' ? (
              <Button
                onClick={recording.startRecording}
                variant="destructive"
                size="sm"
                disabled={recording.status === 'ready'}
                className="gap-2"
              >
                <Circle className="w-4 h-4 fill-current" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={recording.stopRecording}
                variant="secondary"
                size="sm"
                disabled={recording.status !== 'recording'}
                className="gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Recording
              </Button>
            )}

            <Button
              onClick={recording.downloadRecording}
              variant="default"
              size="sm"
              disabled={!recording.recordingBlob}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>

            {recording.status === 'ready' && (
              <Button
                onClick={recording.resetRecording}
                variant="ghost"
                size="sm"
              >
                New Recording
              </Button>
            )}
          </div>

          {/* Center: Status & Duration */}
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-2">
              {recording.status === 'recording' && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
            <span className="text-lg font-mono tabular-nums">
              {formatDuration(recording.duration)}
            </span>
          </div>

          {/* Right: Error Display */}
          {recording.error && (
            <div className="text-red-400 text-sm">
              {recording.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
