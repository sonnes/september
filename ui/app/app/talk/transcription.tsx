'use client';

import { useEffect, useRef, useState } from 'react';

import { MicrophoneIcon, PauseIcon } from '@heroicons/react/24/outline';

import { createMessage } from '@/app/actions/messages';
import useAudioRecorder from '@/app/hooks/useRecorder';
import { useMessages } from '@/components/context/messages';

export default function Transcription() {
  const { recording, startRecording, stopRecording, recordedBlob, clear } = useAudioRecorder();
  const { addMessage } = useMessages();
  const [status, setStatus] = useState<'idle' | 'listening' | 'transcribing'>('idle');

  const transcribeAudio = async () => {
    if (!recordedBlob) {
      return;
    }

    setStatus('transcribing');

    const formData = new FormData();
    formData.append('audio', recordedBlob);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();

      const message = {
        id: crypto.randomUUID(),
        text: result.text,
        type: 'transcription',
      };

      const createdMessage = await createMessage(message);

      addMessage(createdMessage);
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      clear();
      setStatus('idle');
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      stopRecording();
      setStatus('idle');
    } else {
      startRecording();
      setStatus('listening');
    }
  };

  useEffect(() => {
    if (recordedBlob) {
      transcribeAudio();
    }
  }, [recordedBlob]);

  return (
    <div className="relative">
      <button
        onClick={toggleRecording}
        className={`p-2 rounded-full cursor-pointer ${
          recording ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-700'
        }`}
        disabled={status === 'transcribing'}
      >
        {status === 'transcribing' ? (
          <div className="relative">
            <MicrophoneIcon className="h-6 w-6 animate-ping" />
          </div>
        ) : recording ? (
          <div className="relative">
            <PauseIcon className="h-6 w-6" />
            <div className="absolute -inset-1 animate-ping rounded-full border-2 border-red-500 opacity-75" />
          </div>
        ) : (
          <MicrophoneIcon className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
