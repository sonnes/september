'use client';

import { useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import { v4 as uuidv4 } from 'uuid';

import { useAccount } from '@/services/account/context';
import { useMessages } from '@/services/messages';

import { cn } from '@/lib/utils';

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
      <button disabled className="p-2 text-white rounded-full transition-colors cursor-not-allowed">
        <ArrowPathIcon className="w-6 h-6 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      title={listening ? 'Stop' : 'Listening...'}
      className={cn(
        'p-2 text-white rounded-full transition-colors cursor-pointer hover:bg-white/10',
        listening && 'text-red-200 bg-white/20 animate-pulse'
      )}
    >
      {listening ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
    </button>
  );
}

export default function Recorder() {
  const [vadActive, setVadActive] = useState(false);
  const { createMessage } = useMessages();
  const { account, user } = useAccount();

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
    if (result.text.trim() === '' || result.text.length < 3) {
      return;
    }

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

  const isDisabled = !account?.gemini_api_key?.trim();

  return (
    <div className="flex items-center">
      {vadActive ? (
        <VADController onSpeechEnd={handleSpeechEnd} />
      ) : (
        <button
          onClick={toggleRecording}
          title="Start recording"
          disabled={isDisabled}
          className={cn(
            'p-2 rounded-full transition-colors',
            isDisabled
              ? 'cursor-not-allowed text-white/50'
              : 'text-white cursor-pointer hover:bg-white/10'
          )}
        >
          <MicrophoneIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
