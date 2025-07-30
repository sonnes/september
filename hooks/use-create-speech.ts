export function useCreateSpeech() {
  const createSpeech = async ({ text, voice_id }: { text: string; voice_id?: string }) => {
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id }),
    });

    const { blob, alignment } = await response.json();

    return { blob, alignment };
  };

  const bulkCreateSpeech = async ({ texts, voice_id }: { texts: string[]; voice_id?: string }) => {
    const responses = await Promise.all(
      texts.map(async text => {
        const response = await fetch('/api/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice_id }),
        });

        const { blob, alignment } = await response.json();

        return { blob, alignment };
      })
    );

    return responses;
  };

  return { createSpeech, bulkCreateSpeech };
}
