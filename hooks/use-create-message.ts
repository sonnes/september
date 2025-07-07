import { useState } from 'react';

export function useCreateMessage() {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');

  const createMessage = async (text: string) => {
    setStatus('loading');
    // Replace this with your actual message creation logic (API call, etc.)
    console.log(text);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    setStatus('idle');
  };

  return { createMessage, status };
}
