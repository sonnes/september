'use client';

import { useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

function VADController({ onSpeechEnd }: { onSpeechEnd: (blob: Blob) => Promise<void> }) {
  const { listening, loading, toggle } = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: async (audio: Float32Array) => {
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: 'audio/wav' });

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
      <button disabled className="flex items-center gap-2 px-2 py-4 cursor-not-allowed">
        <ArrowPathIcon className="h-4 w-4 animate-spin" />{' '}
        <span className="text-sm">Loading...</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      title={listening ? 'Stop' : 'Listening...'}
      className={cn(
        'flex items-center gap-2 px-2 py-4 cursor-pointer group hover:bg-zinc-100',
        listening && 'text-indigo-500'
      )}
    >
      {listening ? <StopIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
      <span className="text-sm">{listening ? 'Listening...' : 'Listen'}</span>
    </button>
  );
}

export default function Recorder() {
  const [vadActive, setVadActive] = useState(false);
  const { createMessage } = useMessages();
  const { user } = useAccount();

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
      user_id: user.id,
    };

    await createMessage(message);
  };

  const toggleRecording = () => {
    setVadActive(active => !active);
  };

  return (
    <div className="flex items-center">
      {vadActive ? (
        <VADController onSpeechEnd={handleSpeechEnd} />
      ) : (
        <button
          onClick={toggleRecording}
          title="Start recording"
          className="flex items-center gap-2 px-2 py-4 cursor-pointer group hover:bg-zinc-100"
        >
          <MicrophoneIcon className="h-4 w-4" /> <span className="text-sm">Listen</span>
        </button>
      )}
    </div>
  );
}
