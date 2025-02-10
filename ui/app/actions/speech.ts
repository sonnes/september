'use server';

import { ElevenLabs, ElevenLabsClient } from 'elevenlabs';

import { createClient } from '@/supabase/server';
import type { Message } from '@/supabase/types';

const voiceId = '3vXjdKMDgxJoOLbElGxC';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const generateSpeech = async (text: string) => {
  const response = await client.textToSpeech.convert(voiceId, {
    output_format: ElevenLabs.OutputFormat.Mp34410032,
    text: text,
    model_id: 'eleven_turbo_v2',
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.5,
      style: 0,
    },
  });

  const chunks = [];
  for await (const chunk of response) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

export const createSpeechFile = async ({ id, text }: { id: string; text: string }) => {
  const audio = await generateSpeech(text);
  const file = new File([audio], `${id}.mp3`, { type: 'audio/mp3' });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('speech')
    .upload(file.name, file, { contentType: 'audio/mp3' });
  if (error) {
    throw error;
  }

  return data;
};
