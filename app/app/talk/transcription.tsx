'use client';

import { useEffect, useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, PauseIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

import { createMessage } from '@/app/actions/messages';
import { useMessages } from '@/components/context/messages';

function VADController({
  onTranscribe,
  onStop,
}: {
  onTranscribe: (blob: Blob) => Promise<void>;
  onStop: () => void;
}) {
  const { listening, loading, errored, userSpeaking, pause, start } = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: async (audio: Float32Array) => {
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: 'audio/wav' });
      await onTranscribe(blob);
    },
  });

  // Pause and notify parent when stopped
  const handlePause = () => {
    pause();
    onStop();
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
      <div className="p-2 rounded-md bg-gray-100">
        <ArrowPathIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <button
      onClick={handlePause}
      className={clsx(
        'p-2 rounded-md cursor-pointer',
        listening && !userSpeaking && 'bg-red-100 text-red-500',
        userSpeaking && 'bg-green-100 text-green-500'
      )}
    >
      <PauseIcon className="h-6 w-6" />
    </button>
  );
}

export default function Transcription() {
  const { addMessage } = useMessages();
  const [vadActive, setVadActive] = useState(false);

  const transcribeAudio = async (wav: Blob) => {
    if (!wav) {
      return;
    }

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
    addMessage(createdMessage);
  };

  const toggleRecording = () => {
    setVadActive(active => !active);
  };

  return (
    <div>
      {vadActive ? (
        <VADController onTranscribe={transcribeAudio} onStop={() => setVadActive(false)} />
      ) : (
        <button onClick={toggleRecording} className={clsx('p-2 rounded-md cursor-pointer')}>
          <MicrophoneIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
