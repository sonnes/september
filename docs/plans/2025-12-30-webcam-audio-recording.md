# Implementation Plan: Webcam Video and Audio Recording

**Date**: 2025-12-30
**Feature**: Webcam video recording with TTS audio capture and MP4 download
**Status**: Ready for Implementation

## Overview

Add recording capability to the display page that captures webcam video and generated TTS audio, outputting to MP4 format (with WebM fallback) for download.

### Final Requirements Confirmed

- **Output Format**: MP4 (using ffmpeg.wasm), fallback to WebM if conversion fails
- **Audio Source**: Generated TTS audio only via Web Audio API destination
- **Integration**: Extend `app/display/[id]/page.tsx`
- **Control Bar**: Fixed bottom bar (always visible during display)
- **Workflow**: Manual start/stop, download button enabled after stop, stay on page
- **Audio Playback**: Play through speakers AND capture in recording
- **HTTP Headers**: Next.js config with COOP/COEP headers for SharedArrayBuffer

---

## Architecture Overview

### Key Design Decisions

**1. Modular Package Structure**

Create `packages/recording/` following the established pattern from keyboards/documents packages:
- Separate concerns (hooks, components, lib, types)
- Self-contained with public API via index.ts
- README.md for architectural documentation

**2. Web Audio API for Audio Capture**

Use `AudioContext.createMediaStreamDestination()` to capture audio playback:
- Connect audio element source to destination
- Also connect to default destination for speaker playback
- MediaRecorder uses the destination stream

**3. Stream Merging Pattern**

Combine webcam video track + audio destination track into single MediaStream:
- Extract video track from webcam getUserMedia
- Extract audio track from Web Audio API destination
- Create new MediaStream with both tracks

**4. ffmpeg.wasm for MP4 Conversion**

Convert WebM output to MP4 for better compatibility:
- Load ffmpeg.wasm on demand (not during initial page load)
- Show conversion progress in UI
- Fallback to WebM if conversion fails

**5. Integration with Display Page**

Extend existing display page instead of creating separate recording page:
- Add recording controls to bottom of display
- Use existing webcam and audio infrastructure
- Minimal changes to existing code

---

## Package Structure

### Create: `packages/recording/`

```
packages/recording/
├── components/
│   ├── recording-provider.tsx      # Context provider for recording state
│   └── recording-controls.tsx      # Control bar UI component
├── hooks/
│   ├── use-recording.ts           # Main orchestration hook
│   ├── use-video-stream.ts        # Webcam video stream management
│   ├── use-audio-destination.ts   # Web Audio API destination capture
│   └── use-media-converter.ts     # ffmpeg.wasm MP4 conversion
├── lib/
│   └── stream-merger.ts           # Merge video + audio streams
├── types/
│   └── index.ts                   # TypeScript interfaces and Zod schemas
├── index.ts                       # Public API exports
└── README.md                      # Architecture documentation
```

---

## Dependencies

### Install Required Packages

```bash
pnpm add @ffmpeg/ffmpeg@^0.12.10 @ffmpeg/util@^0.12.1
```

**Package Sizes**:
- `@ffmpeg/ffmpeg`: ~500KB (core library)
- `@ffmpeg/util`: ~50KB (utilities)
- ffmpeg-core.wasm: ~30MB (loaded on demand, not bundled)

---

## Type Definitions

### File: `packages/recording/types/index.ts`

```typescript
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
```

---

## Core Hooks Implementation

### 1. Video Stream Hook

**File**: `packages/recording/hooks/use-video-stream.ts`

```typescript
'use client';

import { useCallback, useRef, useState } from 'react';
import type { UseVideoStreamReturn } from '../types';

export function useVideoStream(): UseVideoStreamReturn {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const initializeStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false, // Audio comes from Web Audio API
      });

      streamRef.current = stream;
      setVideoStream(stream);
      setIsLoading(false);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access webcam';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setVideoStream(null);
    }
  }, []);

  return {
    videoStream,
    error,
    isLoading,
    initializeStream,
    stopStream,
  };
}
```

---

### 2. Audio Destination Hook

**File**: `packages/recording/hooks/use-audio-destination.ts`

```typescript
'use client';

import { useCallback, useRef } from 'react';
import type { UseAudioDestinationReturn } from '../types';

export function useAudioDestination(): UseAudioDestinationReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    // Create AudioContext and destination on first use
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
    }

    // Disconnect previous source if exists
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    try {
      // Create source from audio element
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current = source;

      // Connect to destination (for recording)
      source.connect(destinationRef.current);

      // ALSO connect to default destination (for speaker playback)
      source.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('[AudioDestination] Failed to connect audio:', err);
    }
  }, []);

  const disconnectAudio = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const getAudioStream = useCallback(() => {
    return destinationRef.current?.stream || null;
  }, []);

  return {
    audioDestination: destinationRef.current,
    connectAudio,
    disconnectAudio,
    getAudioStream,
  };
}
```

---

### 3. Media Converter Hook

**File**: `packages/recording/hooks/use-media-converter.ts`

```typescript
'use client';

import { useCallback, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { UseMediaConverterReturn } from '../types';

export function useMediaConverter(): UseMediaConverterReturn {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(async (webmBlob: Blob): Promise<Blob> => {
    setIsConverting(true);
    setProgress(0);
    setError(null);

    try {
      // Load ffmpeg.wasm on demand
      const ffmpeg = new FFmpeg();

      // Load core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setProgress(20);

      // Progress listener
      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(20 + Math.floor(p * 70)); // 20-90%
      });

      // Write input file
      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
      setProgress(90);

      // Convert to MP4
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-c:v', 'libx264',      // H.264 video codec
        '-preset', 'fast',       // Balance speed/quality
        '-c:a', 'aac',          // AAC audio codec
        '-b:a', '192k',         // Audio bitrate
        'output.mp4',
      ]);

      setProgress(95);

      // Read output file
      const data = await ffmpeg.readFile('output.mp4');
      const mp4Blob = new Blob([data], { type: 'video/mp4' });

      setProgress(100);
      setIsConverting(false);

      return mp4Blob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      setIsConverting(false);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    convert,
    isConverting,
    progress,
    error,
  };
}
```

---

### 4. Stream Merger Utility

**File**: `packages/recording/lib/stream-merger.ts`

```typescript
/**
 * Merge video and audio tracks into a single MediaStream
 */
export function mergeStreams(
  videoStream: MediaStream,
  audioStream: MediaStream
): MediaStream {
  const videoTracks = videoStream.getVideoTracks();
  const audioTracks = audioStream.getAudioTracks();

  if (videoTracks.length === 0) {
    throw new Error('No video track found in video stream');
  }

  if (audioTracks.length === 0) {
    throw new Error('No audio track found in audio stream');
  }

  // Create combined stream with both tracks
  const combinedStream = new MediaStream([
    videoTracks[0],
    audioTracks[0],
  ]);

  return combinedStream;
}
```

---

### 5. Main Recording Hook

**File**: `packages/recording/hooks/use-recording.ts`

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeStreams } from '../lib/stream-merger';
import type { RecordingFormat, RecordingStatus, UseRecordingReturn } from '../types';
import { useAudioDestination } from './use-audio-destination';
import { useMediaConverter } from './use-media-converter';
import { useVideoStream } from './use-video-stream';

export function useRecording(): UseRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<RecordingFormat | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoStream = useVideoStream();
  const audioDestination = useAudioDestination();
  const converter = useMediaConverter();

  // Update duration every second while recording
  useEffect(() => {
    if (status === 'recording' && startTimeRef.current) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  const startRecording = useCallback(async () => {
    setStatus('initializing');
    setError(null);
    setRecordingBlob(null);
    setFormat(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      // Get video stream from webcam
      const video = await videoStream.initializeStream();

      // Get audio stream from Web Audio API destination
      const audio = audioDestination.getAudioStream();

      if (!audio) {
        throw new Error('Audio destination not initialized');
      }

      // Merge video and audio streams
      const combinedStream = mergeStreams(video, audio);

      // Create MediaRecorder with WebM output
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setStatus('stopping');

        // Create WebM blob
        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });

        // Try to convert to MP4
        try {
          setStatus('converting');
          const mp4Blob = await converter.convert(webmBlob);
          setRecordingBlob(mp4Blob);
          setFormat('mp4');
          setStatus('ready');
        } catch (conversionError) {
          console.warn('[Recording] MP4 conversion failed, using WebM:', conversionError);
          // Fallback to WebM
          setRecordingBlob(webmBlob);
          setFormat('webm');
          setStatus('ready');
        }

        // Cleanup streams
        videoStream.stopStream();
      };

      recorder.onerror = (event) => {
        const errorMessage = 'Recording error occurred';
        console.error('[Recording]', errorMessage, event);
        setError(errorMessage);
        setStatus('error');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second

      startTimeRef.current = Date.now();
      setStatus('recording');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[Recording] Start error:', err);
      setError(errorMessage);
      setStatus('error');
      videoStream.stopStream();
    }
  }, [videoStream, audioDestination, converter]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [status]);

  const downloadRecording = useCallback(() => {
    if (!recordingBlob || !format) return;

    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${new Date().toISOString().slice(0, 10)}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordingBlob, format]);

  const resetRecording = useCallback(() => {
    setStatus('idle');
    setError(null);
    setDuration(0);
    setRecordingBlob(null);
    setFormat(null);
    chunksRef.current = [];
    startTimeRef.current = null;
  }, []);

  return {
    status,
    error,
    duration,
    recordingBlob,
    format,
    conversionProgress: converter.progress,
    startRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
  };
}
```

---

## Components

### 1. Recording Context Provider

**File**: `packages/recording/components/recording-provider.tsx`

```typescript
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRecording } from '../hooks/use-recording';
import { useAudioDestination } from '../hooks/use-audio-destination';
import type { UseRecordingReturn, UseAudioDestinationReturn } from '../types';

interface RecordingContextValue {
  recording: UseRecordingReturn;
  audioDestination: UseAudioDestinationReturn;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const recording = useRecording();
  const audioDestination = useAudioDestination();

  return (
    <RecordingContext.Provider value={{ recording, audioDestination }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecordingContext must be used within RecordingProvider');
  }
  return context;
}
```

---

### 2. Recording Controls Component

**File**: `packages/recording/components/recording-controls.tsx`

```typescript
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
```

---

## Package Public API

### File: `packages/recording/index.ts`

```typescript
// Components
export { RecordingProvider, useRecordingContext } from './components/recording-provider';
export { RecordingControls } from './components/recording-controls';

// Hooks
export { useRecording } from './hooks/use-recording';
export { useVideoStream } from './hooks/use-video-stream';
export { useAudioDestination } from './hooks/use-audio-destination';
export { useMediaConverter } from './hooks/use-media-converter';

// Types
export type {
  RecordingStatus,
  RecordingFormat,
  RecordingMetadata,
  UseRecordingReturn,
  UseVideoStreamReturn,
  UseAudioDestinationReturn,
  UseMediaConverterReturn,
} from './types';

// Utilities
export { mergeStreams } from './lib/stream-merger';
```

---

## Next.js Configuration

### File: `next.config.ts` (MODIFY)

Add HTTP headers for SharedArrayBuffer support:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config ...

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Important**: These headers are required for ffmpeg.wasm to work.

---

## Display Page Integration

### File: `app/display/[id]/page.tsx` (MODIFY)

**Changes Required**:

1. **Add RecordingProvider wrapper**:
```typescript
import { RecordingProvider, RecordingControls } from '@/packages/recording';

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  return (
    <RecordingProvider>
      <DisplayContent chatId={chatId} />
    </RecordingProvider>
  );
}
```

2. **Connect audio destination** (inside DisplayContent):
```typescript
const { audioDestination } = useRecordingContext();

useEffect(() => {
  if (current?.blob) {
    const audio = new Audio(current.blob);
    audioDestination.connectAudio(audio);
    audio.play();

    return () => {
      audio.pause();
      audioDestination.disconnectAudio();
    };
  }
}, [current?.blob, audioDestination]);
```

3. **Add RecordingControls to layout**:
```typescript
return (
  <div className="relative w-full h-screen overflow-hidden bg-black">
    {/* Existing: Webcam, Text Overlay, Status Indicator */}

    {/* NEW: Recording Controls */}
    <RecordingControls />
  </div>
);
```

---

## Implementation Tasks

### Phase 1: Package Setup and Dependencies

- [ ] Create `packages/recording/` directory structure
- [ ] Install dependencies: `pnpm add @ffmpeg/ffmpeg@^0.12.10 @ffmpeg/util@^0.12.1`
- [ ] Create `packages/recording/types/index.ts`
- [ ] Verify TypeScript compilation

### Phase 2: Core Hooks

- [ ] Create `use-video-stream.ts`
- [ ] Create `use-audio-destination.ts`
- [ ] Create `use-media-converter.ts`
- [ ] Create `lib/stream-merger.ts`
- [ ] Create `use-recording.ts` (main orchestration)

### Phase 3: Components

- [ ] Create `recording-provider.tsx`
- [ ] Create `recording-controls.tsx`
- [ ] Create `index.ts` (public API)

### Phase 4: Next.js Configuration

- [ ] Add COOP/COEP headers to `next.config.ts`
- [ ] Verify headers in browser DevTools

### Phase 5: Display Page Integration

- [ ] Add RecordingProvider wrapper
- [ ] Connect audio destination
- [ ] Add RecordingControls component

### Phase 6: Documentation

- [ ] Create `packages/recording/README.md`

### Phase 7: Testing

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test error scenarios
- [ ] Test MP4 conversion fallback

---

## Success Criteria

### Functional
- [ ] Start recording webcam video
- [ ] Capture synthesized TTS audio
- [ ] Combine video + audio in single file
- [ ] Stop recording on user action
- [ ] Download as MP4 (or WebM fallback)
- [ ] Display recording duration
- [ ] Show status indicators

### Non-Functional
- [ ] No audio/video sync issues
- [ ] Clean memory cleanup
- [ ] Clear error messages
- [ ] TypeScript compilation passes
- [ ] ESLint passes

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/recording/types/index.ts` | Type definitions |
| `packages/recording/hooks/use-video-stream.ts` | Webcam stream |
| `packages/recording/hooks/use-audio-destination.ts` | Audio capture |
| `packages/recording/hooks/use-media-converter.ts` | MP4 conversion |
| `packages/recording/hooks/use-recording.ts` | Main hook |
| `packages/recording/lib/stream-merger.ts` | Stream utility |
| `packages/recording/components/recording-provider.tsx` | Context |
| `packages/recording/components/recording-controls.tsx` | UI |
| `packages/recording/index.ts` | Public API |
| `packages/recording/README.md` | Documentation |

## Files to Modify

| File | Changes |
|------|---------|
| `next.config.ts` | Add COOP/COEP headers |
| `app/display/[id]/page.tsx` | Add RecordingProvider and controls |
