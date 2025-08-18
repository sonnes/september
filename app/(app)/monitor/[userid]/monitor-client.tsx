'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { User } from '@supabase/supabase-js';
import Webcam from 'react-webcam';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useMessages } from '@/hooks/use-messages';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/supabase/client';
import { Audio } from '@/types/audio';
import { Message } from '@/types/message';

interface MonitorClientProps {
  userId: string;
}

export default function MonitorClient({ userId }: MonitorClientProps) {
  const webcamRef = useRef(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

  const { enqueue } = useAudioPlayer();
  const { showError } = useToast();

  // Create a mock user object for the useMessages hook
  const mockUser: User = {
    id: userId,
    email: '',
    created_at: '',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
  };

  const { messages } = useMessages({
    user: mockUser,
    messages: [],
  });

  useEffect(() => {
    const speechMessages = messages.filter(message => message.type === 'speech');
    if (speechMessages.length > 0) {
      setLatestMessage(speechMessages[speechMessages.length - 1]);
    }
  }, [messages]);

  // Handle new messages
  useEffect(() => {
    console.log('latestMessage', latestMessage);
    if (latestMessage && latestMessage.audio_path) {
      console.log('enqueue', latestMessage.audio_path);
      enqueue({
        path: latestMessage.audio_path,
      });
    }
  }, [latestMessage, enqueue]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Webcam Video */}

      <Webcam
        audio={false}
        ref={webcamRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video
      />

      {/* Text Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="text-center max-w-4xl">
          {latestMessage ? (
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-white drop-shadow-2xl leading-tight">
                {latestMessage.text}
              </h1>
              <div className="text-sm md:text-base text-white/80 font-medium">
                {new Date(latestMessage.created_at).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-white/60">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">Monitoring</h1>
              <p className="text-xl md:text-2xl">Waiting for messages...</p>
            </div>
          )}
        </div>
      </div>

      {/* User ID indicator */}
      <div className="absolute top-4 left-4 text-white/60 font-mono text-sm">User: {userId}</div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2 text-white/80 text-sm">
          <div className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`} />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
