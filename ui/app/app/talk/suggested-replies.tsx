'use client';

import { useEffect, useState } from 'react';

import { createUserMessage } from '@/app/actions/messages';
import { Button } from '@/components/catalyst/button';
import { useMessages } from '@/components/context/messages';
import { usePlayer } from '@/components/context/player';

interface SuggestionResponse {
  suggestions: string[];
}

export function SuggestedReplies() {
  const { messages, addMessage } = useMessages();
  const { setPlaying } = usePlayer();

  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data: SuggestionResponse = await response.json();
        setReplies(data.suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setReplies([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch suggestions when there are messages
    if (messages.length > 0) {
      // fetchSuggestions();
    }
  }, [messages]);

  if (replies.length === 0) {
    return null;
  }

  const handleReplyClick = async (reply: string) => {
    const message = {
      id: crypto.randomUUID(),
      text: reply,
      type: 'message',
    };

    const createdMessage = await createUserMessage(message);
    addMessage(createdMessage);
    setPlaying(createdMessage);
  };

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {replies.map((reply, index) => (
        <Button
          outline
          key={index}
          className="text-sm whitespace-nowrap"
          onClick={() => handleReplyClick(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
}
