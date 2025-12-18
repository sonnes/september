'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';
import moment from 'moment';

import { useToast } from '@/hooks/use-toast';

import { useAudioPlayer } from '@/components/audio/audio-player';
import { useAudioStorage } from '@/components/audio/use-audio-storage';
import { useSpeech } from '@/components/speech/use-speech';
import { cn } from '@/lib/utils';
import type { Audio } from '@/types/audio';
import type { Message } from '@/types/message';

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.type === 'user';
  const { enqueue, isPlaying, current, togglePlayPause } = useAudioPlayer();
  const { generateSpeech } = useSpeech();
  const { showError } = useToast();
  const { downloadAudio } = useAudioStorage();

  const [audio, setAudio] = useState<Audio | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentTrack = current?.id === message.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;

  const handleClick = async () => {
    if (isLoading) return;

    if (isCurrentlyPlaying) {
      togglePlayPause();
      return;
    }

    if (audio) {
      enqueue(audio);
      return;
    }

    try {
      setIsLoading(true);

      if (message.audio_path) {
        const blob = await downloadAudio(message.audio_path);

        if (blob) {
          const audioTrack: Audio = {
            path: message.audio_path,
            blob: Buffer.from(await blob.arrayBuffer()).toString('base64'),
          };

          setAudio(audioTrack);
          enqueue(audioTrack);
        }
      } else {
        const audioTrack = (await generateSpeech(message.text)) as Audio;
        audioTrack.id = message.id;
        audioTrack.text = message.text;
        setAudio(audioTrack);
        enqueue(audioTrack);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      showError('Error playing audio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex w-full max-w-[95%] flex-col gap-2',
        isUser ? 'is-user ml-auto items-end' : 'is-assistant'
      )}
    >
      <div
        onClick={handleClick}
        className={cn(
          'relative flex w-fit max-w-full min-w-0 cursor-pointer flex-col gap-2 overflow-hidden text-sm transition-opacity hover:opacity-90',
          'group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground',
          'group-[.is-assistant]:text-foreground',
          isLoading && 'opacity-70'
        )}
        role="button"
        tabIndex={0}
        aria-label={isCurrentlyPlaying ? 'Pause message' : 'Play message'}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <p className="text-foreground wrap-break-word">{message.text}</p>
      </div>
      <p className={cn('text-xs text-muted-foreground', isUser ? 'text-right' : 'text-left')}>
        {moment(message.created_at).fromNow()}
      </p>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {[...messages].reverse().map((message, index) => (
        <MessageItem key={message.id || index} message={message} />
      ))}
    </div>
  );
}
