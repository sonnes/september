# Recorder

Recorder is a component that continuously records the audio input from the microphone. Wheneever there is a pause in the audio input, the audio is passed to a callback function.

```tsx
<Recorder
  onAudioData={(audioData) => {
    // Do something with the audio data
  }}
  onStarted={() => {
    // Recorder has started
  }}
  onStopped={() => {
    // Recorder has stopped
  }}
/>
```

# Transcriber

Create a transcriber queue that receives audio data from the recorder and passes it to `/api/transcribe` for transcription.

Each transcription status is displayed in the message history
