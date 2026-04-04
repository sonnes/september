'use client';

import { use, useEffect, useState } from 'react';

import moment from 'moment';
import Webcam from 'react-webcam';

import { ReelTextViewer, useAudioPlayer } from '@september/audio';
import { DisplayMessage } from '@september/shared/types/display';

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = use(params);
  const [latestMessage, setLatestMessage] = useState<DisplayMessage | null>(null);

  const { enqueue, current } = useAudioPlayer();

  // BroadcastChannel listener for chat-specific messages
  useEffect(() => {
    const channelName = `chat-display-${chatId}`;
    const channel = new BroadcastChannel(channelName);

    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const msg = event.data;
      if (msg.type === 'new-message') {
        setLatestMessage(msg);
        enqueue({ blob: msg.audio, alignment: msg.alignment });
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
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        onUserMediaError={error => {
          console.warn('[Display] Webcam permission denied:', error);
        }}
      />

      {/* Text Overlay */}
      {latestMessage ? (
        <>
          <ReelTextViewer
            text={latestMessage.message.text}
            alignment={current?.alignment}
            className="absolute inset-0"
          />
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <span className="text-sm text-white/60 font-medium">
              {moment(latestMessage.timestamp).fromNow()}
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xl text-white/60">Waiting for messages...</p>
        </div>
      )}

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
