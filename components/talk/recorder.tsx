'use client';

import { useEffect, useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, PauseIcon, StopIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import { uuidv4 } from 'zod';

import { Button } from '@/components/ui/button';
import { useCreateMessage } from '@/hooks/use-create-message';

function VADController({
  onSpeechEnd,
  onStop,
}: {
  onSpeechEnd: (blob: Blob) => Promise<void>;
  onStop: () => void;
}) {
  const { listening, loading, pause, start } = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: async (audio: Float32Array) => {
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: 'audio/wav' });
      console.log('onSpeechEnd', blob);
      if (onSpeechEnd) {
        await onSpeechEnd(blob);
      }
    },
  });

  // Pause and notify parent when stopped
  const handlePause = () => {
    pause();
    if (onStop) {
      onStop();
    }
  };

  // Auto-pause when window loses focus
  useEffect(() => {
    const handleBlur = () => {
      if (listening) {
        handlePause();
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [listening]);

  if (loading) {
    return (
      <Button variant="outline" color="white" disabled>
        Loading... <ArrowPathIcon className="h-6 w-6 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePause}
      title={listening ? 'Stop recording' : 'Recording...'}
      variant="outline"
      color="white"
    >
      {listening ? 'Stop' : 'Listen'} {listening && <StopIcon className="h-6 w-6" />}
    </Button>
  );
}

export default function Recorder() {
  const [vadActive, setVadActive] = useState(false);
  const { createMessage } = useCreateMessage();

  const handleSpeechEnd = async (wav: Blob) => {
    const formData = new FormData();
    formData.append('audio', wav);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const result = await response.json();
    const message = {
      id: uuidv4(),
      text: result.text,
      type: 'transcription',
    };

    const createdMessage = await createMessage(message);
    console.log(createdMessage);
  };

  const handleStop = () => {
    setVadActive(false);
  };

  const toggleRecording = () => {
    setVadActive(active => !active);
  };

  return (
    <div className="flex items-center">
      {vadActive ? (
        <VADController onSpeechEnd={handleSpeechEnd} onStop={handleStop} />
      ) : (
        <Button onClick={toggleRecording} title="Start recording" variant="outline" color="white">
          Listen <MicrophoneIcon className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
