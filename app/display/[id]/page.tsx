'use client';

import { use, useEffect, useRef, useState } from 'react';

import moment from 'moment';
import Webcam from 'react-webcam';

import { TextViewer, TextViewerWords, useAudioPlayer } from '@/packages/audio';
import { DisplayMessage } from '@/types/display';

function DisplayContent({ chatId }: { chatId: string }) {
  const webcamRef = useRef(null);
  const [latestMessage, setLatestMessage] = useState<DisplayMessage | null>(null);

  const { enqueue, current } = useAudioPlayer();

  // Dynamic text sizing based on word count (from old display-client.tsx)
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

  // BroadcastChannel listener for chat-specific messages
  useEffect(() => {
    const channelName = `chat-display-${chatId}`;
    const channel = new BroadcastChannel(channelName);

    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const msg = event.data;
      if (msg.type === 'new-message') {
        setLatestMessage(msg);

        // Audio blob passed directly via channel - no download needed
        if (msg.audio) {
          // Auto-play audio directly in the callback
          console.log('enqueueing audio', msg.audio, msg.alignment);
          enqueue({ blob: msg.audio, alignment: msg.alignment });
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [enqueue, chatId]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Webcam Video */}
      <Webcam
        audio={false}
        ref={webcamRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video
        onUserMediaError={error => {
          console.warn('[Display] Webcam permission denied:', error);
          // Silent failure - will show black background with text overlay
        }}
      />

      {/* Text Overlay */}
      <div
        className={`absolute inset-0 flex items-start justify-center p-8 ${
          latestMessage ? getTextPosition(latestMessage.message.text) : 'pt-[33.33%]'
        }`}
      >
        <div className="text-center max-w-5xl backdrop-blur-sm rounded-2xl p-6">
          {latestMessage ? (
            <div className="space-y-4">
              {current?.alignment ? (
                <TextViewer
                  alignment={current.alignment}
                  className="bg-black/20 border-0 rounded-2xl px-4 py-2 space-y-0"
                >
                  <TextViewerWords
                    className={`${getTextSize(latestMessage.message.text)} font-bold tracking-tight **:data-[status=spoken]:text-white **:data-[status=unspoken]:text-white **:data-[status=current]:bg-white **:data-[status=current]:text-black`}
                  />
                </TextViewer>
              ) : (
                <p
                  className={`${getTextSize(latestMessage.message.text)} font-bold text-white tracking-tight bg-black/20 rounded-2xl px-4 py-2`}
                >
                  {latestMessage.message.text}
                </p>
              )}
              <div className="text-sm md:text-base text-white/80 font-medium">
                {moment(latestMessage.timestamp).fromNow()}
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
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);

  return <DisplayContent chatId={chatId} />;
}
