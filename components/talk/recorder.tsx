'use client';

import { useEffect, useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, PauseIcon, StopIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { useCreateMessage } from '@/hooks/use-create-message';

function VADController({ onSpeechEnd }: { onSpeechEnd: (blob: Blob) => Promise<void> }) {
  const { listening, loading, toggle } = useMicVAD({
    startOnLoad: true,
    onFrameProcessed: () => {
      console.log('onFrameProcessed');
    },
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
  const handleToggle = () => {
    toggle();
  };

  if (loading) {
    return (
      <Button variant="outline" color="white" disabled>
        Loading... <ArrowPathIcon className="h-6 w-6 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      title={listening ? 'Stop recording' : 'Recording...'}
      variant="outline"
      color="white"
    >
      {listening ? 'Stop' : 'Listen'}{' '}
      {listening ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
    </Button>
  );
}

export default function Recorder() {
  const [vadActive, setVadActive] = useState(false);
  const { createTranscription } = useCreateMessage();

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
    };

    await createTranscription(message);
  };

  const toggleRecording = () => {
    setVadActive(active => !active);
  };

  return (
    <div className="flex items-center">
      {vadActive ? (
        <VADController onSpeechEnd={handleSpeechEnd} />
      ) : (
        <Button onClick={toggleRecording} title="Start recording" variant="outline" color="red">
          Listen <MicrophoneIcon className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
