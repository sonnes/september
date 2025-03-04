// https://github.com/nico-martin/markdown-editor/blob/main/src/app/hooks/useAudioRecorder.ts
import React from 'react';

const getMimeType = () => {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/aac'];
  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) {
      return types[i];
    }
  }
  return undefined;
};

const useAudioRecorder = (): {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recording: boolean;
  duration: number;
  recordedBlob: Blob | null;
  clear: () => void;
} => {
  const [recording, setRecording] = React.useState<boolean>(false);
  const [duration, setDuration] = React.useState<number>(0);
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);

  const streamRef = React.useRef<MediaStream>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  const clear = () => {
    setRecordedBlob(null);
  };

  const startRecording = async () => {
    // Reset recording (if any)
    setRecordedBlob(null);
    setDuration(0);

    const startTime: number = Date.now();
    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }

    const mimeType = getMimeType();
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.addEventListener('dataavailable', async event => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
      if (mediaRecorder.state === 'inactive') {
        // Received a stop event
        let blob = new Blob(chunksRef.current, { type: mimeType });

        setRecordedBlob(blob);

        chunksRef.current = [];
      }
    });
    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // set state to inactive
      setRecording(false);
    }
  };

  React.useEffect(() => {
    const stream: MediaStream | null = streamRef.current;

    if (recording) {
      const timer = setInterval(() => {
        setDuration(prevDuration => prevDuration + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [recording]);

  return {
    startRecording,
    stopRecording,
    recording,
    duration,
    recordedBlob,
    clear,
  };
};

export default useAudioRecorder;
