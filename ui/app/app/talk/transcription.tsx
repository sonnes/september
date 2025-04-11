'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowPathIcon, MicrophoneIcon, PauseIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useMicVAD, utils } from '@ricky0123/vad-react';
import clsx from 'clsx';

import { createMessage } from '@/app/actions/messages';
import { useMessages } from '@/components/context/messages';

export default function Transcription() {
  const { addMessage } = useMessages();
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
      id: crypto.randomUUID(),
      text: result.text,
      type: 'transcription',
    };

    const createdMessage = await createMessage(message);
    addMessage(createdMessage);
  };

  const { listening, loading, errored, userSpeaking, pause, start } = useMicVAD({
    startOnLoad: false,
    onSpeechEnd: async (audio: Float32Array) => {
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: 'audio/wav' });
      await transcribeAudio(blob);
    },
  });

  const toggleRecording = () => {
    if (listening) {
      pause();
    } else {
      start();
    }
  };

  if (loading) {
    return (
      <div className="p-2 rounded-md bg-gray-100">
        <ArrowPathIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleRecording}
      className={clsx(
        'p-2 rounded-md cursor-pointer',
        loading && 'bg-gray-100',
        listening && !userSpeaking && 'bg-red-100 text-red-500',
        userSpeaking && 'bg-green-100 text-green-500'
      )}
    >
      {listening && <PauseIcon className="h-6 w-6" />}
      {!listening && <MicrophoneIcon className="h-6 w-6" />}
    </button>
  );
}
