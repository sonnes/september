'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import moment from 'moment';
import Webcam from 'react-webcam';

import AnimatedText from '@/components/uix/animated-text';

import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account/context';
import { AudioService } from '@/services/audio/supabase';

import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserMessages } from '@/supabase/realtime';
import { Message } from '@/types/message';

export default function MonitorClient() {
  const audioService = useMemo(() => new AudioService(supabase), []);

  const webcamRef = useRef(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

  // Dynamic text sizing based on word count
  const getTextSize = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 3) return 'text-8xl lg:text-9xl';
    if (wordCount <= 10) return 'text-6xl lg:text-8xl';
    if (wordCount <= 15) return 'text-4xl lg:text-6xl';
    if (wordCount <= 25) return 'text-3xl lg:text-5xl';
    return 'text-2xl lg:text-4xl';
  };

  // Dynamic positioning based on word count
  const getTextPosition = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 6) return 'pt-[30%]';
    if (wordCount <= 12) return 'pt-[20%]';
    return 'pt-[10%]';
  };

  const { enqueue } = useAudioPlayer();
  const { user } = useAccount();
  const { showError } = useToast();

  // Realtime subscription for messages
  useEffect(() => {
    const channel = subscribeToUserMessages<Message>(user.id, {
      onInsert: newMessage => {
        if (newMessage.type !== 'message') return;
        setLatestMessage(newMessage);
      },
      onError: error => {
        console.error('Messages realtime error:', error);
        showError('Failed to receive real-time updates');
      },
      onSubscribe: status => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to messages changes');
        }
      },
    });

    // Cleanup function to unsubscribe on unmount
    return () => {
      removeRealtimeSubscription(channel);
    };
  }, [user.id, showError]);

  useEffect(() => {
    async function downloadAudio() {
      if (latestMessage && latestMessage.audio_path) {
        const audio = await audioService.downloadAudio(latestMessage.audio_path);

        enqueue({
          blob: Buffer.from(await audio.arrayBuffer()).toString('base64'),
        });
      }
    }

    downloadAudio();
  }, [latestMessage, enqueue, audioService]);

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
      <div
        className={`absolute inset-0 flex items-start justify-center p-8 ${latestMessage ? getTextPosition(latestMessage.text) : 'pt-[33.33%]'}`}
      >
        <div className="text-center max-w-5xl backdrop-blur-sm rounded-2xl p-6">
          {latestMessage ? (
            <div className="space-y-4">
              <AnimatedText
                text={latestMessage.text}
                speed={400}
                className={`${getTextSize(latestMessage.text)} font-bold text-white tracking-tight bg-black/20 rounded-2xl px-4 py-2`}
              />
              <div className="text-sm md:text-base text-white/80 font-medium">
                {moment(latestMessage.created_at).fromNow()}
              </div>
            </div>
          ) : (
            <div className="text-white/60">
              <p className="text-xl md:text-2xl">Waiting for messages...</p>
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2 text-white/80 text-lg font-medium">
          <div className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`} />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
