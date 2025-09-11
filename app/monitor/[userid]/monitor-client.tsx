'use client';

import { useEffect, useRef, useState } from 'react';

import moment from 'moment';
import Webcam from 'react-webcam';

import AnimatedText from '@/components/ui/animated-text';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from '@/services/account/context';
import { MessagesService } from '@/services/messages';
import supabase from '@/supabase/client';
import { removeRealtimeSubscription, subscribeToUserMessages } from '@/supabase/realtime';
import { Message } from '@/types/message';

interface MonitorClientProps {
  userId: string;
}

export default function MonitorClient({}: MonitorClientProps) {
  const messagesService = new MessagesService(supabase);

  const webcamRef = useRef(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);

  const { enqueue } = useAudioPlayer();
  const { user } = useAccount();
  const { showError } = useToast();

  // Realtime subscription for messages
  useEffect(() => {
    const channel = subscribeToUserMessages<Message>(user.id, {
      onInsert: newMessage => {
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
        const audio = await messagesService.downloadAudio(latestMessage.audio_path);

        enqueue({
          blob: Buffer.from(await audio.arrayBuffer()).toString('base64'),
        });
      }
    }

    downloadAudio();
  }, [latestMessage, enqueue, messagesService]);

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
      <div className="absolute inset-0 flex items-end justify-center p-8 pb-[33.33%]">
        <div className="text-center max-w-4xl">
          {latestMessage ? (
            <div className="space-y-4">
              <AnimatedText
                text={latestMessage.text}
                speed={400}
                className="text-4xl md:text-6xl lg:text-8xl font-bold text-white drop-shadow-2xl leading-tight uppercase"
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
        <div className="flex items-center space-x-2 text-white/80 text-sm">
          <div className={`w-2 h-2 rounded-full bg-indigo-500 animate-pulse`} />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
