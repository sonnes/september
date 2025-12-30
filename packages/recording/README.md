# Recording Package

Webcam video recording with TTS audio capture for the September app.

## Features

- Webcam video capture (1920x1080)
- TTS audio capture via Web Audio API
- MP4 output (H.264/AAC codecs)
- WebM fallback if conversion fails
- Real-time duration tracking
- Progress indicators
- Automatic error recovery

## Architecture

### Audio Capture Strategy

Uses Web Audio API `createMediaStreamDestination()` to capture audio playback:

1. Audio player connects to both:
   - `audioContext.destination` (speaker output)
   - Custom destination node (recording output)

2. MediaRecorder receives:
   - Video track from webcam
   - Audio track from destination node

This ensures audio plays AND is captured simultaneously.

### Format Conversion

- **Primary**: MP4 (better compatibility, H.264 video + AAC audio)
- **Fallback**: WebM (native MediaRecorder output, VP9 video + Opus audio)
- **Conversion**: ffmpeg.wasm (lazy loaded, only when needed)

### Performance Considerations

- ffmpeg.wasm: ~30MB download (first use only, cached thereafter)
- Conversion time: ~1-2x video duration
- Memory: WebM blob held in RAM during conversion
- Recommended max duration: 10 minutes per recording

## Usage

### Basic Setup

```typescript
import { RecordingProvider, RecordingControls } from '@/packages/recording';

function App() {
  return (
    <RecordingProvider>
      <YourContent />
      <RecordingControls />
    </RecordingProvider>
  );
}
```

### With Audio Integration

```typescript
import { useRecordingContext } from '@/packages/recording';
import { useEffect } from 'react';

function AudioComponent() {
  const { audioDestination } = useRecordingContext();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioDestination.connectAudio(audioRef.current);
    }
    return () => audioDestination.disconnectAudio();
  }, [audioDestination]);

  return <audio ref={audioRef} />;
}
```

### Advanced Usage with Custom Controls

```typescript
import { useRecording } from '@/packages/recording';

function CustomRecorder() {
  const recording = useRecording();

  return (
    <div>
      <button onClick={recording.startRecording} disabled={recording.status !== 'idle'}>
        Start
      </button>
      <button onClick={recording.stopRecording} disabled={recording.status !== 'recording'}>
        Stop
      </button>
      <p>Status: {recording.status}</p>
      <p>Duration: {recording.duration}s</p>
      {recording.recordingBlob && (
        <button onClick={recording.downloadRecording}>
          Download
        </button>
      )}
      {recording.error && <p>Error: {recording.error}</p>}
    </div>
  );
}
```

## Browser Compatibility

| Browser | Version | Support | Notes |
|---------|---------|---------|-------|
| Chrome  | 88+     | ✅ Yes  | Full support with MP4 conversion |
| Firefox | 78+     | ✅ Yes  | Full support with MP4 conversion |
| Safari  | 15.4+   | ✅ Yes  | May require HTTPS in production |
| Edge    | 88+     | ✅ Yes  | Full support with MP4 conversion |

**Requirements**:
- HTTPS in production (localhost works in development)
- SharedArrayBuffer support (for ffmpeg.wasm)
- COOP/COEP headers configured (see next.config.ts)

## Hooks

### useRecording()

Main orchestration hook for recording management.

**Returns**: `UseRecordingReturn`

```typescript
interface UseRecordingReturn {
  // State
  status: 'idle' | 'initializing' | 'recording' | 'stopping' | 'converting' | 'ready' | 'error';
  error: string | null;
  duration: number; // seconds
  recordingBlob: Blob | null;
  format: 'webm' | 'mp4' | null;
  conversionProgress: number; // 0-100

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  downloadRecording: () => void;
  resetRecording: () => void;
}
```

**Usage**:
```typescript
const recording = useRecording();

// Start recording
await recording.startRecording();

// Stop when done
recording.stopRecording();

// Download file
recording.downloadRecording();
```

### useVideoStream()

Manages webcam video stream lifecycle.

**Returns**: `UseVideoStreamReturn`

```typescript
const videoStream = useVideoStream();
const stream = await videoStream.initializeStream();
// ... use stream ...
videoStream.stopStream();
```

### useAudioDestination()

Captures audio playback via Web Audio API.

**Returns**: `UseAudioDestinationReturn`

```typescript
const audio = useAudioDestination();
audio.connectAudio(audioElement);
const audioStream = audio.getAudioStream();
// ... use audioStream ...
audio.disconnectAudio();
```

### useMediaConverter()

Converts WebM to MP4 using ffmpeg.wasm.

**Returns**: `UseMediaConverterReturn`

```typescript
const converter = useMediaConverter();
try {
  const mp4Blob = await converter.convert(webmBlob);
} catch (error) {
  // Handle conversion error
}
```

## Components

### RecordingProvider

Context provider for recording state. Wraps your app to enable recording functionality.

```typescript
<RecordingProvider>
  <App />
</RecordingProvider>
```

### RecordingControls

Pre-built UI control bar with start/stop/download buttons, duration display, and status indicator.

Features:
- Fixed bottom position
- Responsive layout
- Status text and duration display
- Error messages
- Visual feedback (pulsing dot when recording)

```typescript
<RecordingControls />
```

### useRecordingContext()

Hook to access recording context from components.

```typescript
const { recording, audioDestination } = useRecordingContext();
```

## Troubleshooting

### "SharedArrayBuffer is not defined"

**Cause**: Missing COOP/COEP headers

**Solution**: Ensure `next.config.ts` has:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    },
  ];
}
```

**Verify**:
1. Open DevTools → Network tab
2. Reload page
3. Click any request
4. Check Response Headers for both COOP and COEP

### "No audio in recording"

**Cause**: Audio destination not connected to audio element

**Solution**: Verify `audioDestination.connectAudio(audioElement)` is called:

```typescript
useEffect(() => {
  if (audioElement) {
    audioDestination.connectAudio(audioElement);
  }
  return () => audioDestination.disconnectAudio();
}, [audioDestination]);
```

**Debug**:
1. Check console for errors
2. Verify `audioDestination.getAudioStream()` returns MediaStream with audio track
3. Confirm audio plays through speakers during recording

### "Conversion fails silently"

**Cause**: ffmpeg.wasm load fails or conversion error

**Solution**: Check WebM fallback is working

By design, if MP4 conversion fails, the recording automatically falls back to WebM format. Check:
1. Browser console for ffmpeg errors
2. Network tab for WASM file load (should be ~30MB from unpkg CDN)
3. Verify recording format in final output

### "Webcam permission denied"

**Cause**: User declined camera access or device unavailable

**Solution**:
1. Check browser settings → Camera permissions
2. Ensure HTTPS in production
3. Check if another app is using the camera
4. Try different browser

**Handle gracefully**:
The `useVideoStream()` hook returns error state:
```typescript
if (videoStream.error) {
  return <div>Camera access denied: {videoStream.error}</div>;
}
```

### "Recording stops unexpectedly"

**Cause**: Browser memory limit reached

**Solution**: Limit recording duration
- Current max: ~10 minutes at 2.5 Mbps
- Add max duration check in UI
- Warn users about long recordings

### "MIME type not supported"

**Cause**: Browser doesn't support VP9 codec

**Solution**: Already handled in code - MediaRecorder will use available codec automatically

## Testing

### Manual Testing Checklist

1. **Basic Recording**
   - [ ] Start recording → webcam light turns on
   - [ ] Duration counter increments
   - [ ] Can stop recording
   - [ ] Status shows "Converting..."

2. **Audio Capture**
   - [ ] Play TTS audio → hears through speakers
   - [ ] Stop recording → audio included in file
   - [ ] Download file → plays with sound

3. **Format Conversion**
   - [ ] File saves as MP4 (primary)
   - [ ] File plays in video player
   - [ ] If conversion fails → WebM fallback works

4. **Error Scenarios**
   - [ ] Deny camera permission → shows error
   - [ ] No camera/microphone → shows error
   - [ ] Long recording → handles without crash
   - [ ] Network interruption → graceful fallback

5. **UI Functionality**
   - [ ] Buttons enable/disable correctly
   - [ ] Duration displays MM:SS format
   - [ ] Status text updates
   - [ ] Download triggers save dialog
   - [ ] New Recording button resets state

### Browser Testing Matrix

Test in each browser:
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome (mobile) - if applicable
- [ ] Safari (iOS) - if applicable

## Architecture Decisions

### Why Web Audio API instead of getUserMedia audio?

- TTS audio is generated, not from microphone
- Need to capture programmatic audio playback
- Web Audio API destination provides clean MediaStream interface
- No coupling to microphone hardware

### Why ffmpeg.wasm instead of server conversion?

- No backend infrastructure required
- Privacy: video never leaves user's browser
- Instant download (no upload/download cycle)
- Works offline once WASM is loaded

### Why MP4 over WebM?

- Better compatibility across devices (iOS, Android)
- Industry standard for video sharing
- Better player support
- WebM fallback ensures always works if conversion fails

### Why fixed bottom control bar?

- Always accessible during recording
- Doesn't obscure webcam feed
- Consistent UX pattern
- Clear visual separation

## Related Files

**Configuration**:
- `/next.config.ts` - COOP/COEP headers

**Integration**:
- `/app/display/[id]/page.tsx` - Display page using recording feature

**Dependencies**:
- `@ffmpeg/ffmpeg` - Video conversion
- `@ffmpeg/util` - FFmpeg utilities
- `lucide-react` - UI icons
- shadcn/ui - UI components

## Performance Optimizations

- FFmpeg WASM loaded on demand (not bundled)
- Recording data collected in chunks (1-second intervals)
- Conversion progress tracked and UI updated
- Memory cleaned up after download
- No blocking operations during recording

## Known Limitations

1. **iOS Safari**: May have limited support for certain codecs
2. **Long Recordings**: Memory usage grows with duration
3. **Network**: WASM download required for MP4 conversion
4. **Background Tabs**: Recording may pause if tab backgrounded (browser policy)

## Future Enhancements

- Pause/resume during recording
- Multiple video quality presets
- Custom branding in watermark
- Recording history storage
- Direct upload to cloud storage
- Audio-only recording mode

## Support

For issues or questions about the recording feature:
1. Check troubleshooting section above
2. Review browser DevTools console for errors
3. Verify COOP/COEP headers are configured
4. Test in different browser

## License

Part of the September assistive communication app.
